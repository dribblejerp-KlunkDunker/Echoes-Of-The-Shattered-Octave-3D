// ============================================================
//  kestrel16 — Phase 16 "New ground", team KESTREL: the Drift-Kestrel as a home base you can upgrade, with crew you recruit.
//
//  THE SHIP. After the escape (Part Three on) the Kestrel is two walkable maps, registered from this module the way
//  js/house13.js and js/parish.js register theirs (a buildAllMaps wrapper; nothing in maps.js or data.js is edited; no
//  entity is ever added to an old map's saved list):
//    p16k_kestrel_deck   outdoor: a 28-cell hull in a field of lit mist, rail all round (a low wall you see over), the wheel,
//                        the map table, the mast, lashed crates, the ladder over the rail, the companionway hatch
//    p16k_kestrel_below  indoor: tank room (west, the one-note hum) | mess and galley (the stair up, a cold stove) |
//                        bunk room (the bed) over the hold (stash chest, chandler's locker, the repair list, murmuring crates)
//  ROUTES IN (both always leave again by the same ladder; there is no way to be stuck aboard):
//    * Whisper-Grove: the mast-ladder at the south landing (the existing wg_ladder deco). Its use now offers "Climb up to the
//      deck", and, in Part Three only, the old "Climb, and go on to the Deep Woods" which runs the original event untouched.
//    * the Deep Woods camp: the Kestrel deco, once Tobiah has closed the number-two tank (flag tank_patched): a hatch in her flank.
//    * Before the escape the ship stays at the Oakhaven mast ("Nobody is aboard who will talk to you yet"): not boardable.
//  OPTIONAL HOP (new lift-tank + coda_done): the map table flies the Kestrel between the two moorings (4 hours).
//  THE BED (p16k_bed) rests like a house bed: 8 hours (6 with the lanterns), hp/voice/fatigue back (needs-aware, as doRest),
//  bleed/deaf/hushed/fear cleared, injuries mended only with proper bunks. Both map ids contain "kestrel", so js/night13.js
//  counts the ship as SAFE (NIGHT13.isSafePlace): no terror, ever.
//  THE STASH is the existing house strongbox (p.houseStorage, use house_chest), retitled while aboard: same chest as Cooper's Row.
//  THE TABLE opens the existing world-map panel (travel.js). Journeys begun at the table take their bonuses from the ship:
//    minutes: envelope patch x0.85 (rounded to 5 min, min 5);  ambush chance (travelRisk): x(1-0.35 Mags) x(1-0.15 chart room).
//  COOKING aboard: a lit stove (upgrade) carries use p15_cook, so js/hearth15.js's "Cook something" works; TROPHIES: the rail
//  upgrade's six pegs hang hearth15's boss trophies (own flags p16k_rp0..5; a trophy hangs aboard or at home, never both).
//
//  THE UPGRADES (one table, UPG above; prices in sovereigns + existing items; the engineer takes a fifth off the gold):
//    envelope  60 + 3 Silver Proctor-Mesh + 1 Bell-Bronze Scrap   map-table journeys take 85% of the time        silk patch hung at the mast
//    lamps     50 + 1 Light-Glass Shard + 2 Scrap                  rest 6 h not 8; passage ambient +0.10         six glass lanterns glow
//    stove     45 + 4 Scrap                                        cooking aboard; Nell can bake                 cold stove becomes a lit one
//    rail      35 + 2 Scrap                                        six trophy pegs                               pegged board + pegs
//    bunks     40 + 2 Mesh + 1 Scrap                               rest also mends injuries                      four blanketed bunks
//    chart     70 + 1 Mesh + 1 Shard                               map-table ambush chance x0.85                 awning, wall charts, sextant
//    tank     140 + 6 Scrap + 4 Mesh + 2 Shard + 2 Governor-Gear   the two-mooring hop (needs the engineer, envelope, tank_patched)   a third, burnished tank
//  Materials are never out of reach: the chandler's locker in the hold sells Scrap 12, Mesh 18, Gear 30, Shard 55.
//
//  THE CREW [PROPOSED for Book One; the game's own text wins]. Mags Tennant (bosun) and Tobiah Marsh (second engineer) are
//  already in the game (js/data.js mags_dw: she stopped hearing, reads lips, speaks aloud and knows hand-cant). The engineer
//  is UNNAMED (author's ruling 2026-10-20: Pennick is a Book Two person; titles, not names; the internal id stays 'pennick'
//  for saves): the FIRST engineer Tobiah is second to, who has been below the whole time. Nobody is
//  recruited by force: each has a short beat in dialogue, a place aboard, a daily line and one small effect.
//    Mags     (deaf, lip-reads, speaks and signs)  part3+; pay 30 sovereigns for a new lens   ambush chance x0.65 on map-table journeys
//             Her lines are italic with a [signs] note (she signs as she speaks). She answers ONLY when she can see your face: stand in front of her
//             (within 7 cells, her facing within ~78 degrees of you). From behind she does not hear you; after 4 s of you
//             standing within 3.4 cells she feels the deck move and turns round.
//    engineer (unnamed, pessimist)     tank_patched and the envelope fitted          gold cost of every upgrade x0.80; builds the new tank
//    Nell     (the mill; only if pim_safe) the stove is fitted                         once a game day, one Hearth Bread
//    Abner      (the tanner; only if twins_named, i.e. he climbed) the lanterns fitted   once a game day, +35 condition to the readied weapon
//    (Pim Carder, with his mother, sits in the bunk room when pim_safe: the existing NPC, no effect.) Nobody who dies in the
//    story is ever aboard, and nobody here is story-bound: no flag the main quest reads is set or read for gating anything but
//    tank_patched, pim_safe, twins_named, part3, part4, coda_done (all set by the story, never by this module).
//
//  STATE: G.flags under p16k_ only, validated on every read (FLAGS): up (7 bits), crew (4), seen (6), moor 0-2, visits, loaf,
//  mend (game day + 1), rest, rp0..rp5. Anything else under the prefix is dropped on load; values are clamped to whole
//  numbers in range. Props, people and trophies are TRANSIENT entities rebuilt from the flags (furnish); the maps are built
//  deterministically so saved entity indexes line up. No markup is built from saves: every string is a constant (S()).
//  SWITCH: Options -> Graphics & access -> "Aboard the Drift-Kestrel" (default On; localStorage 'octave.kestrel16.v1').
//  Off = the game as it was: the ladder runs the original event, the Kestrel deco says what it said, no wrapped function
//  changes anything (and if you are aboard when it goes off you are put back on the ground).
//  ART: procedural stand-ins (canvas, painted once and cached). Every invented fact is marked [PROPOSED].
// ============================================================
'use strict';

const KESTREL16 = (function () {
  const KEY = 'octave.kestrel16.v1';
  const cfg = { on: true };
  function loadCfg() {
    try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o && typeof o === 'object' && typeof o.on === 'boolean') cfg.on = o.on; } catch (e) { /* storage blocked: the default stands */ }
  }
  function saveCfg() { try { localStorage.setItem(KEY, JSON.stringify({ on: cfg.on })); } catch (e) { /* ignore */ } }

  const DECK = 'p16k_kestrel_deck', BELOW = 'p16k_kestrel_below', MAPS = [DECK, BELOW];
  const FP = 'p16k_';

  // ---------------------------------------------------------------- balance, one table (the report repeats it)
  const B = {
    ENV_TIME: 0.85,        // Envelope patch: journeys begun at the map table take 85% of the time (rounded to 5 min, min 5)
    MAGS_RISK: 0.35,       // Mags on lookout: ambush chance x (1 - 0.35)
    CHART_RISK: 0.15,      // Chart room: ambush chance x (1 - 0.15)   (the two multiply: 0.65 x 0.85 = 0.5525)
    DISCOUNT: 0.20,        // the engineer: the gold cost of every upgrade x 0.80 (all base prices are multiples of 5, so exact)
    REST_HOURS: 8, LAMP_HOURS: 6,
    LENS: 30,              // what Mags asks for a new glass
    MEND: 35,              // Abner: +35 condition to the readied weapon, once a game day (the whetstone's number)
    LOAF: 1,               // Nell: one Hearth Bread, once a game day
    HOP_HOURS: 4,          // flying the Kestrel between the two moorings
    CHASE: 14,             // a hostile this close and chasing: nobody climbs a rope with that behind them
    SIGHT: 0.2,            // Mags sees your face when dot(her facing, direction to you) > this, within SIGHT_R
    SIGHT_R: 7,
    AMB_BELOW: 0.34, AMB_LAMPS: 0.10,
    FILL: [17, 12, 4],      // Cinematic only: warm fill light at the middle of each dark room below (its haze and grade read darker)
  };

  // ---------------------------------------------------------------- the upgrades (the one table; the text is in TX.up)
  // id        bit  gold  materials (existing items)                       effect (exact)                               visible change
  // envelope   0    60   3 Silver Proctor-Mesh, 1 Bell-Bronze Scrap       map-table journeys x0.85 time                 a new silk patch hung from the mast
  // lamps      1    50   1 Light-Glass Shard, 2 Scrap                      rest aboard 6 h, not 8; passage ambient +0.10  six glass lanterns glow
  // stove      2    45   4 Scrap                                          cook aboard (js/hearth15.js); Nell can bake   the cold stove is replaced by a lit one
  // rail       3    35   2 Scrap                                          six trophy pegs aboard (hearth15 trophies)    a pegged board on the mess bulkhead
  // bunks      4    40   2 Proctor-Mesh, 1 Scrap                          rest aboard also mends injuries               four more bunks, blanketed
  // chart      5    70   1 Proctor-Mesh, 1 Light-Glass Shard               map-table ambush chance x0.85                 an awning, wall charts and a sextant
  // tank       6   140   6 Scrap, 4 Mesh, 2 Shard, 2 Governor-Gear         fly between the two moorings (the engineer, tank patched, envelope fitted)   a third, burnished tank
  const UPG = [
    { id: 'envelope', bit: 0, gold: 60, mats: [['v_mesh', 3], ['v_scrap', 1]] },
    { id: 'lamps', bit: 1, gold: 50, mats: [['shard', 1], ['v_scrap', 2]] },
    { id: 'stove', bit: 2, gold: 45, mats: [['v_scrap', 4]] },
    { id: 'rail', bit: 3, gold: 35, mats: [['v_scrap', 2]] },
    { id: 'bunks', bit: 4, gold: 40, mats: [['v_mesh', 2], ['v_scrap', 1]] },
    { id: 'chart', bit: 5, gold: 70, mats: [['v_mesh', 1], ['shard', 1]] },
    { id: 'tank', bit: 6, gold: 140, mats: [['v_scrap', 6], ['v_mesh', 4], ['shard', 2], ['v_gear', 2]] },
  ];
  // the chandler's locker in the hold: so no upgrade is ever out of reach for want of a thing. price in sovereigns
  const LOCKER = [['v_scrap', 12], ['v_mesh', 18], ['v_gear', 30], ['shard', 55]];
  // the crew (bit in p16k_crew)
  const CREW = ['mags', 'pennick', 'nell', 'hob'];

  // ---------------------------------------------------------------- the text [PROPOSED] (all of it; see TEXT.md)
  const LIST = [];
  const S = (t) => { LIST.push(t); return t; };
  // Mags signs: every line of hers is italic with a sign note, registered whole so the French file matches what is shown
  const SG = (t) => S('<i>[signs] ' + t + '</i>');
  const TX = {
    opts: {
      label: S('Aboard the Drift-Kestrel'),
      hint: S('walk the ship you escaped on: a bed, a stash, a map table, upgrades and crew. Off: she is a backdrop, as before.'),
    },
    mapDeck: S('The Drift-Kestrel, deck'),
    mapBelow: S('The Drift-Kestrel, below-decks'),
    board: {
      wgTitle: S('The mast-ladder'),
      wgBody: S('A hundred feet of rope up into the lilac mist, and the Kestrel\'s keel above it, lift-tanks murmuring one note. At the rail a shape that might be Mags is looking down, and has probably been looking for some time.'),
      wgBodyAway: S('A hundred feet of rope up into the lilac mist, and the Kestrel\'s keel above it, lift-tanks murmuring one note. Nobody is at the rail. Mags is down at the camp in the Deep Woods with her arm in a sling.'),
      up: S('Climb up to the deck.'),
      on: S('Climb, and go on to the Deep Woods.'),
      no: S('Not yet.'),
      dwTitle: S('The Drift-Kestrel'),
      dwBody: S('The cargo hatch in her flank stands open, and a rope ladder hangs from it. Lamp-oil, wet rope and hot brass come out of the dark. Somebody inside is tapping a tank with a spanner and listening to the answer.'),
      dwUp: S('Climb in.'),
      dwNo: S('Leave her be.'),
      chased: S('Not with something on your heels. It would follow you up a rope.'),
      fight: S('Not in the middle of this. Finish it first.'),
      first: S('The deck takes your weight and gives a little of it back. Under the rail the mist is lit from below, like a held breath.'),
      journalFirst: S('The Drift-Kestrel, walked: a deck, a hold, a galley, a bunk room, and the tank room where the hum comes from. There is a bunk that is mine to use, a chest for what I do not want to carry, a map table, and a repair list in Vane\'s hand. Everything on the list costs money.'),
      ladderLabel: S('The ladder, down to {0}'),
      toCourt: S('the Sunken Court'),
      toCamp: S('the camp in the Deep Woods'),
      hatchLabel: S('The companionway: below-decks'),
      upLabel: S('The companionway: up to the deck'),
      arriveCourt: S('You come down the ladder into a foot of warm, lit water. The Hollows go on walking their loops and do not look up.'),
      arriveCamp: S('You climb down the baulks and into the smell of the camp fire.'),
    },
    deck: {
      helm: S('The wheel. The brass has been polished by somebody who denies it.'),
      mast: S('The mast, stitched and re-stitched. Every knot is a different person\'s.'),
      crates: S('Lashed crates. They are not the crates from the hold.'),
      rope: S('Six feet of rope coiled on the deck, and nobody will say whose job it is to coil it.'),
      lamp: S('A deck lantern, hooded against the mist.'),
      rail: S('The rail. Past it, mist lit from underneath, and nothing you could stand on.'),
      patch: S('The envelope patch: Office mesh and silk in long laps, hung from the mast where it can be inspected and admired.'),
      awning: S('An awning of waxed canvas over the map table, so the charts stay dry in the mist.'),
      charts: S('Wall charts of the Reach and the Woods, pinned flat. Somebody has pencilled small crosses along two of the roads.'),
      sextant: S('A brass sextant with a Light-glass sight. It points, unhelpfully, at the Grove.'),
      magsAway: S('Mags\'s brass glass, capped and lashed to the bow rail where she stands her watch. She is down at the camp in the Deep Woods, with her arm in a sling.'),
      glass: S('A Light-glass lantern. It hums at five twenty-eight, very faintly, and it is warm.'),
    },
    below: {
      tankA: S('Number-one lift-tank. The oldest of the three and the steadiest.'),
      tankB: S('Number-two lift-tank, closed with weaverling silk and an Office valve. It hums a little flat.'),
      tankC: S('The new lift-tank, built up from the cutter\'s. The brass has been rubbed until it looks wet.'),
      gauge: S('A pressure gauge. The needle has said forty since Oakhaven.'),
      bench: S('The engineer\'s bench. Every tool has a chalk outline, and every outline is occupied.'),
      stoveCold: S('A cast-iron stove with a cold firebox and a pot hung on it. Somebody has swept it. Nobody has lit it.'),
      stove: S('The galley stove, drawing well. The pipe goes up through the deck and out into the mist.'),
      shelf: S('Tinned goods, a bag of grey flour, and a jar with a label that says only HONEY, in a child\'s hand.'),
      table: S('The mess table. Twenty-one cups on hooks, and room to sit, if you do not mind your elbows.'),
      bunk: S('A bunk by the bulkhead: the one that does not drip.'),
      hammock: S('A hammock, slung hook to hook. Somebody is lying in it very still, pretending not to listen.'),
      bunkNew: S('A proper bunk with a blanket, and a hook for a coat.'),
      crates: S('Crates in straw. The hold murmurs, softly. Vane has stopped coming down.'),
      stash: S('The stash chest. What goes in weighs nothing on the road, and it is the same chest as the one on Cooper\'s Row.'),
      locker: S('The chandler\'s locker: a rack of scrap, mesh and gear, with a price chalked beside each, in three different hands.'),
      board: S('The repair list, in Vane\'s hand, nailed to a stanchion. Most of it is the engineer\'s opinion.'),
      railBoard: S('A plank of Reach timber with brass pegs. It rings faintly when the ship moves.'),
      pegBare: S('A bare peg on the trophy rail. Something won could hang here.'),
      lantern: S('A Light-glass lantern. It hums at five twenty-eight, very faintly, and it is warm.'),
      hum: S('A single low note, from the tanks'),
    },
    crewBeat: {
      leaves: S('The hold hatch is open to the mist.'),
    },
    table: {
      title: S('The map table'),
      body: S('Charts pinned flat under four brass weights: the Reach on one side, the Woods on the other, and the ring from a cup over the Hedge.'),
      mags: S('<i>Mags has pencilled a small, neat cross at the edge of each road she does not like.</i>'),
      plan: S('Plan a journey from the table.'),
      flyCamp: S('Fly the Kestrel to the camp in the Deep Woods.'),
      flyCourt: S('Fly the Kestrel to the Sunken Court.'),
      back: S('Step back.'),
      hopMsgCamp: S('The engineer holds the number-two tank at pressure for four hours, and the Kestrel makes the hop to the Deep Woods and settles in the willows.'),
      hopMsgCourt: S('The engineer holds the tanks at pressure for four hours, and the Kestrel makes the hop back and hangs over the dry marble at the south landing.'),
      hopNo: S('She will not make the hop yet. The tanks want a hand that knows them, and a third tank to share the load.'),
      hopWait: S('Vane will not lift while the choir is waiting. It is the one thing he has said on the subject, and he said it twice.'),
    },
    bed: {
      label: S('A bunk by the bulkhead, the one that does not drip (Safe full rest)'),
      slept: S('You sleep {0} hours in a bunk that hums one note, and the note is the only voice in your head.'),
      mended: S('Your injuries mend in the blanketed bunk.'),
    },
    chest: S('The stash chest (shared storage)'),
    list: {
      title: S('The repair list'),
      intro: S('In Vane\'s hand, with the engineer\'s opinions in the margin. The prices are the chandlers\'; he would like that noted.'),
      purse: S('Purse: {0} sovereigns.'),
      disc: S('The engineer takes a fifth off the gold.'),
      fit: S('Fit it'), fitted: S('Fitted'), need: S('Needs: {0}'),
      cost: S('{0} sovereigns'),
      noGold: S('Not enough sovereigns.'), noMats: S('Missing materials.'),
      lockerTitle: S('The chandler\'s locker'),
      lockerHint: S('Anything the list asks for, at the locker\'s price.'),
      buy: S('Buy'), bought: S('You take the {0} out of the locker and leave the coin on the shelf.'),
      close: S('Close'),
      reqPennick: S('the engineer aboard'), reqEnvelope: S('the envelope patch'), reqPatched: S('the number-two tank closed'),
      fitMsg: S('Done: {0}.'),
    },
    up: {
      envelope: {
        name: S('A mended envelope patch'),
        desc: S('Journeys begun at the map table take 15% less time.'),
        fit: S('The patch goes on in long laps of Office mesh and silk, and a seam that has wept since Oakhaven stops weeping. Vane inspects it for a long time and says nothing, which is his review.'),
        remark: S('That patch holds. I stopped checking it. I started checking it again.'),
      },
      lamps: {
        name: S('Light-glass lanterns'),
        desc: S('Rest aboard takes six hours, not eight, and the passage is brighter.'),
        fit: S('Six lanterns, one shard apiece of what the Grove leaves lying about. They hum at five twenty-eight, and the passage stops being a place you hurry through.'),
        remark: S('The lanterns are warm. I put my hand on one at night. Nobody saw that.'),
      },
      stove: {
        name: S('An iron galley stove'),
        desc: S('You can cook aboard (Camp cooking), and Nell, if she sails with you, will bake.'),
        fit: S('The stove is bolted to the deck and draws like a chimney. The galley smells of nothing for an hour and then of everything.'),
        remark: S('There is a smell in the passage I had forgotten. It turned out to be dinner.'),
      },
      rail: {
        name: S('A trophy rail'),
        desc: S('Six brass pegs on the mess bulkhead for the trophies you have won.'),
        fit: S('Six brass pegs on a plank of Reach timber. Vane says nobody hangs anything of his on it, and then asks which of them are yours.'),
        remark: S('Nobody hangs anything of mine on that rail. I mention it so it is on the record.'),
      },
      bunks: {
        name: S('Proper bunks and blankets'),
        desc: S('Rest aboard also mends injuries.'),
        fit: S('Four bunks, each with a blanket and a hook for a coat. The bunk room stops sounding like a cargo hold and starts sounding like a room.'),
        remark: S('The lad sleeps through the night now. The rest of us sleep through the lad.'),
      },
      chart: {
        name: S('A chart room'),
        desc: S('An awning, wall charts and a sextant. Ambushes on journeys begun at the map table are 15% less likely.'),
        fit: S('Waxed canvas over the table, a brass sextant on a stand, and charts pinned flat. The mist gets in anyway, but it gets in politely.'),
        remark: S('Somebody has drawn the Hedge road on the chart in pencil. I would like to know who, and I would like to know how they got it right.'),
      },
      tank: {
        name: S('A new lift-tank'),
        desc: S('The engineer\'s pride, built up from the cutter\'s. The Kestrel can make the forty-mile hop between the Deep Woods and the Sunken Court.'),
        fit: S('The engineer works through the night without speaking. At dawn the new tank is bolted in, he has put his ear to it nine times, and he says it is going to fail, but later than the others.'),
        remark: S('Three tanks, three notes, and one of them is the wrong one. I am not telling you which.'),
      },
    },
    crew: {
      leaveSightNo: S('She is watching the mist, and the mist is not going to tell her you are there. She cannot hear you. Walk round in front of her, where she can see your face.'),
      mags: {
        name: S('Mags Tennant, bosun'),
        label: S('Mags Tennant, at the bow rail, watching'),
        labelSeen: S('Mags Tennant, watching your mouth'),
        greetP: SG('Slow, please. Face me.'),
        greetN: SG('I read lips, not minds. Say it to my face.'),
        greetB: S('<i>She watches your mouth for exactly as long as it takes you to stop, and turns back to the mist.</i>'),
        tShip: SG('I cannot hear her hum. I feel it in my teeth. That is how I know she is still ours.'),
        tTopic: SG('The rest of you go quiet and I do not notice. I notice when your mouths stop moving. It is the same, I think, from the other side.'),
        intro: S('<i>She does not turn when you come up behind her. You step round into her line of sight and she lowers the brass glass, reads your mouth, and answers aloud, signing as she speaks:</i> <i>[signs] I saw you coming from the far side of the Grove. I always see things first.</i>'),
        offer: SG('The road looks different from up here. Give me a lens that is not cracked, thirty sovereigns, and I will watch it for you from the table. I will not tell you where the hounds are. I will tell you which road they are not on.'),
        camp: S('<i>She tucks the splice under her sling arm and talks with the free hand, signing one-handed as she speaks:</i>'),
        pay: S('Pay for the lens. (30 sovereigns)'),
        later: S('Not yet.'),
        short: SG('Thirty. I know what a lens costs. Come back with it, and face me when you do.'),
        done: SG('Done. From the table, I am your eyes.'),
        doneMsg: S('Mags stands the lookout: ambushes on journeys begun at the map table are 35% less likely.'),
        j: S('Mags Tennant will stand the lookout at the Kestrel\'s map table. I bought her a new lens. She reads the road for ambushes before we set out.'),
        d: [
          SG('Weather is turning. I can see it in the way Vane stops talking.'),
          SG('Do not shout up the ladder. Wave. I would rather see you than be told.'),
          SG('The engineer talks to the tanks. Tobiah talks to the engineer, and the tanks listen to both. I do not know which is better.'),
          SG('You move like someone who is tired of being heard. Good. So is the ship.'),
          SG('The children asked me for the sign for up. It took an afternoon. They use it for everything.'),
          SG('If you see my back, step round. I am not rude. I am deaf. Those are different problems.'),
        ],
      },
      pennick: {
        name: S('The Kestrel\'s engineer'),
        label: S('The engineer, at the tanks'),
        greetP: S('Mind the pipework. It is older than your manners and in better shape.'),
        greetN: S('It is going to fail. I am only deciding which morning.'),
        greetB: S('Touch nothing. If you must touch something, tell me what, so I know where to start.'),
        tShip: S('Three tanks, one note, no margin. The hum is the number-two tank. If you ever stop hearing it, come and get me before you come and get anyone else.'),
        tTopic: S('It hums at its own pitch, and it tells you what it keeps if you listen. I do not listen. I weld.'),
        early: S('She weeps at the seam and I have a list as long as the passage. Come back when somebody has closed number two properly. Until then I am not buying parts for a ship I give a week.'),
        patched: S('Tobiah\'s patch is holding. I have put my ear to it nine times. Mend the envelope first, the list is in the hold, and I will tell you what else is wrong with her. It is a long list.'),
        offer: S('You mended the envelope. Fine. I have looked at what you paid for. I could take the tanks in hand, and the prices, and I would make your money last. It will not last. It will last longer.'),
        take: S('Ask him to take the tanks in hand.'),
        done: S('Pessimist\'s terms. I keep the tanks. You keep the money. I will see it goes further.'),
        doneMsg: S('The engineer takes the tanks in hand: every upgrade costs a fifth less gold, and he will build the new lift-tank.'),
        j: S('The Kestrel\'s engineer, who has kept her tanks humming and has been below since Oakhaven, has taken them in hand. Every fitting on the repair list costs a fifth less gold, and he will build the new lift-tank.'),
        d: [
          S('The number-two tank is making the sound it makes before it makes another sound.'),
          S('Gauge says forty. Gauge has said forty since Oakhaven. I do not trust a number that steady.'),
          S('Do not thank me. Thank me when she is still up on Stasisday.'),
          S('Everything breaks. I just prefer to be there when it does.'),
          S('Tobiah means well. That is the problem with Tobiah.'),
          S('Rope is rotting at the aft block. I have told Vane. Vane tells me about the Office.'),
        ],
      },
      nell: {
        name: S('Nell Carder, of the mill'),
        label: S('Nell Carder, with a bag of flour'),
        greetP: S('Wipe your boots. I have flour on the deck and I mean to keep it there.'),
        greetN: S('Do not go near the lad with the cough. He is fine. He is only not to be gone near.'),
        greetB: S('Out of my light.'),
        tShip: S('Twenty-one cups on hooks. I counted them twice. It is a comfort to have a number you can hold.'),
        tTopic: S('It was a mill town. That is not nothing. The wheel will have a tree through it by now and the stones will still be turning, and I keep the flour so something of it is still used for what it was for.'),
        wantStove: S('"A mill with no mill," she says, turning a handful of grey flour over. "I kept this from the Hedge. Give me a stove and I will earn the lad\'s berth and mine."'),
        offer: S('"The stove draws," she says, and puts her hand flat on the iron as if it were a horse. "Give me the galley, and I will give you bread."'),
        give: S('Give her the galley.'),
        later: S('Not yet.'),
        done: S('She puts the flour in your hands and then takes it back, because it is hers. "Morning bread. Every morning. Take it or leave it on the shelf, but do not tell me it is cold."'),
        doneMsg: S('Nell has the galley: once a game day she will hand you a Hearth Bread.'),
        j: S('Nell Carder has the Kestrel\'s galley. Once a day there is bread, and the lad watches the oven door with his clean hands folded.'),
        loaf: S('Take the morning loaf.'),
        loafGot: S('She hands you the loaf without looking up. It is still warm, and it smells of the Reach before the Reach went wrong.'),
        loafNone: S('"You had yours," she says. "Come back when I have made more."'),
        d: [
          S('Reach flour tastes of less every harvest. This is from before. I am spending it on bread, because bread is what flour is for.'),
          S('The lad\'s hands are still clean. I check them every morning. He has stopped asking why.'),
          S('Hearth bread wants a hot stove and no company. You have given me one of those.'),
          S('They sang the calling-song after us from four miles back. I knead to it, slowly.'),
        ],
      },
      hob: {
        name: S('Abner Fenning, tanner'),
        label: S('Abner Fenning, on a sack of hides'),
        greetP: S('Evening. Mind the vats. There are no vats, but mind them.'),
        greetN: S('A tannery is the one trade that gets quieter the harder you work it. A ship is the other way about.'),
        greetB: S('I have buried two apprentices this year. Try me.'),
        tShip: S('Everything up here creaks. In a tannery a creak is a flaw. Up here it is a conversation.'),
        tTopic: S('The twins went down the culvert after their dog. I put out the lamp in their window before I climbed. It was the first thing I had been able to do for them in a month.'),
        wantLamp: S('He turns a strip of hide over in his hands. "No light in this ship worth cutting leather by," he says. "Give me a lantern for the hold, and I will give you an edge."'),
        offer: S('"The lanterns are good light," he says. "Give me the bench in the hold and I will keep your blade sharp. It is not much. It is what I know."'),
        give: S('Give him the bench in the hold.'),
        later: S('Not yet.'),
        done: S('He sets a lantern on the bench, in a window that is not there, and turns it so the light goes the right way. "Bring me what is worn. I will see to the edge."'),
        doneMsg: S('Abner has the bench in the hold: once a game day he will put an edge back on your readied weapon (+35 condition).'),
        j: S('Abner Fenning has the bench in the Kestrel\'s hold. Once a day he will see to the edge of whatever I carry.'),
        mend: S('Ask him to see to your weapon.'),
        mendGot: S('He takes it, turns it once in the lantern light, draws it twice along a strip of hide and hands it back. It is as good as it has been.'),
        mendNone: S('"It has had its turn today," he says. "Come back when the day has."'),
        mendNoWeapon: S('"There is nothing in your hand," he says, "but your hand."'),
        d: [
          S('Every hide I cure aboard smells of the Reach. I leave the hatch open. It is not for the smell.'),
          S('I put a lamp in a window every night. There is no window. I put it anyway.'),
          S('Ned would have asked what everything was for. Wyn would have asked who it belonged to.'),
          S('Leather does not care what it is holding. That is most of the appeal.'),
        ],
      },
      vane: {
        name: S('Captain Vane of the Drift-Kestrel'),
        label: S('Captain Vane, at the wheel'),
        greetP: S('Welcome aboard. Wipe your feet. She has been sick on worse.'),
        greetN: S('You can look at her. You cannot lean on her.'),
        greetB: S('Say it quick. The rail is loose and so is my patience.'),
        tShip: S('Wood, silk, three tanks and a debt. The engineer would give you a longer list and a worse mood. The repair list is in the hold, nailed to a stanchion. I did not write the prices; the chandlers did.'),
        tTopic: S('I have a file at the Office that says reliable, does not ask questions. I would like it burned, and I would like to read it first.'),
        first: S('You are up, then. Good. Take the bunk by the bulkhead, the one that does not drip. The map table is on deck, the hold is below, the list is on the stanchion, and nobody touches the wheel. That last one is not a courtesy.'),
        d: [
          S('Count is right. I count the lines every morning. Do not read anything into that.'),
          S('Mags says the mist is thinner to the east. Mags says a great deal with two fingers.'),
          S('Somebody has been polishing the brass on the wheel. It was not me. I would like that noted, and I would like to know who.'),
          S('Weight is the whole trade. Keep your pack light and your opinions lighter.'),
          S('Eleven hundred pounds over, and she still lifts. I do not thank her. She would get ideas.'),
          S('If the Office comes, they will come by sound. Keep your footsteps soft and your arguments softer.'),
        ],
      },
    },
  };

  // ---------------------------------------------------------------- state: G.flags under p16k_, validated on every read
  //   p16k_up    0-127   bit per upgrade (UPG[].bit)
  //   p16k_crew  0-15    bit per recruit (CREW order: mags, pennick = the engineer, nell, hob; ids kept for saves)
  //   p16k_seen  0-63    beats seen: 0 aboard, 1 vane, 2 mags, 3 the engineer, 4 nell, 5 hob
  //   p16k_moor  0-2     0 as the story left her (Whisper-Grove in Part Three, the Deep Woods in Part Four), 1 the Court, 2 the camp
  //   p16k_visits 0-9999 times you have climbed aboard
  //   p16k_loaf / p16k_mend  the game day + 1 on which Nell's loaf / Abner's edge were last given (0 never)
  //   p16k_rp0..5 0-12   which trophy (1-12) hangs on rail peg n, 0 bare
  const FLAGS = { p16k_up: [0, 127], p16k_crew: [0, 15], p16k_seen: [0, 63], p16k_moor: [0, 2], p16k_visits: [0, 9999], p16k_loaf: [0, 99999], p16k_mend: [0, 99999], p16k_rest: [0, 9999] };
  for (let i = 0; i < 6; i++) FLAGS['p16k_rp' + i] = [0, 12];
  const hasG = () => typeof G !== 'undefined' && !!G && !!G.flags && typeof G.flags === 'object';
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  function fint(k) {
    const r = FLAGS[k]; if (!r || !hasG()) return 0;
    const v = G.flags[k];
    return typeof v === 'number' && Number.isFinite(v) ? clamp(Math.floor(v), r[0], r[1]) : 0;
  }
  function fset(k, v) { const r = FLAGS[k]; if (!r || !hasG()) return; try { G.flags[k] = clamp(Math.floor(Number(v) || 0), r[0], r[1]); } catch (e) { /* a flags object that cannot be written */ } }
  // a hostile save: unknown p16k_ keys are dropped, known ones are clamped to whole numbers in range
  function sanitize() {
    if (!hasG()) return;
    try {
      for (const k of Object.keys(G.flags)) {
        if (k.indexOf(FP) !== 0) continue;
        const r = FLAGS[k], v = G.flags[k];
        if (!r || typeof v !== 'number' || !Number.isFinite(v)) { delete G.flags[k]; continue; }
        G.flags[k] = clamp(Math.floor(v), r[0], r[1]);
      }
    } catch (e) { /* frozen flags: nothing to sanitise */ }
  }
  const fl = (k) => (hasG() ? G.flags[k] : undefined);
  const today = () => (hasG() && Number.isFinite(Number(G.day)) ? clamp(Math.floor(Number(G.day)), 0, 99998) : 0);
  const upHas = (id) => { const u = UPG.find((x) => x.id === id); return !!u && (fint('p16k_up') & (1 << u.bit)) !== 0; };
  const crewHas = (id) => { const i = CREW.indexOf(id); return i >= 0 && (fint('p16k_crew') & (1 << i)) !== 0; };
  const seenHas = (bit) => (fint('p16k_seen') & (1 << bit)) !== 0;
  const seenSet = (bit) => fset('p16k_seen', fint('p16k_seen') | (1 << bit));
  const say = (t, c, ms) => { try { if (typeof msg === 'function') msg(t, c || '', ms || 4500); } catch (e) { /* the message line is cosmetic */ } };
  const fmt = (s, ...a) => String(s).replace(/\{(\d+)\}/g, (m, i) => (a[+i] == null ? '' : a[+i]));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]));
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; console.warn('kestrel16: ' + k + ' failed', e); } };
  const reduced = () => { try { return !!(GFX.reduceMotion || GFX.reducedMotion); } catch (e) { return false; } };
  const aboard = () => hasG() && !!G.map && MAPS.indexOf(G.mapId) >= 0 && G.map.id === G.mapId;
  // the story: the ship exists for a player who has left Oakhaven by it
  const shipExists = () => hasG() && !!(G.flags.part3 || G.flags.part4);

  // where the Kestrel is moored right now
  function mooring() {
    const m = fint('p16k_moor');
    if (m === 1 && upHas('tank')) return 'whispergrove';
    if (m === 2 && upHas('tank')) return 'deepwoods';
    return hasG() && G.flags.part4 ? 'deepwoods' : 'whispergrove';
  }
  // the rope ladder / the hatch: where you stand when you climb down
  function landing() {
    const id = mooring();
    const m = typeof G !== 'undefined' && G.maps ? G.maps[id] : null;
    const want = id === 'whispergrove' ? { x: 24.5, y: 43.4, dir: -Math.PI / 2 } : { x: 26.2, y: 43.2, dir: Math.PI };
    if (m && typeof travelFreeNear === 'function') { const p = travelFreeNear(m, want.x, want.y); if (p) return { map: id, x: p[0], y: p[1], dir: want.dir }; }
    return m ? { map: id, x: m.spawn.x, y: m.spawn.y, dir: m.spawn.dir || 0 } : { map: 'whispergrove', x: 24.5, y: 43.4, dir: want.dir };
  }

  // costs: the engineer takes a fifth off the gold (exact: every base price is a multiple of 5)
  function costOf(id) {
    const u = UPG.find((x) => x.id === id); if (!u) return null;
    return { gold: crewHas('pennick') ? Math.round(u.gold * (1 - B.DISCOUNT)) : u.gold, mats: u.mats.map((m) => [m[0], m[1]]) };
  }
  // what stands in the way of fitting an upgrade (an array of TX.list.req* keys; empty = nothing)
  function blockers(id) {
    const out = [];
    if (id === 'tank') {
      if (!crewHas('pennick')) out.push('reqPennick');
      if (!upHas('envelope')) out.push('reqEnvelope');
      if (!(hasG() && G.flags.tank_patched)) out.push('reqPatched');
    }
    return out;
  }
  const matName = (id) => (typeof ITEMS !== 'undefined' && ITEMS[id] ? ITEMS[id].name : id);
  const haveMat = (id) => (hasG() && G.player && Array.isArray(G.player.inv) && typeof G.count === 'function' ? G.count(id) : 0);
  function canFit(id) {
    const u = UPG.find((x) => x.id === id); if (!u) return { ok: false, why: 'unknown' };
    if (upHas(id)) return { ok: false, why: 'done' };
    const b = blockers(id); if (b.length) return { ok: false, why: 'req', req: b };
    const c = costOf(id);
    if (!hasG() || !G.player || !(G.player.gold >= c.gold)) return { ok: false, why: 'gold' };
    for (const [m, n] of c.mats) if (haveMat(m) < n) return { ok: false, why: 'mats' };
    return { ok: true };
  }
  function fit(id) {
    if (!shipExists()) return { ok: false, why: 'ship' };
    const r = canFit(id); if (!r.ok) return r;
    const c = costOf(id), u = UPG.find((x) => x.id === id);
    G.player.gold -= c.gold;
    for (const [m, n] of c.mats) for (let i = 0; i < n; i++) G.take(m);
    fset('p16k_up', fint('p16k_up') | (1 << u.bit));
    refresh();
    say(fmt(TX.list.fitMsg, TX.up[id].name) + ' ' + TX.up[id].fit, 'good', 9000);
    try { Audio_.sfx.pickup(); } catch (e) { /* silent */ }
    return { ok: true, gold: c.gold, mats: c.mats };
  }
  function buyMaterial(id) {
    const row = LOCKER.find((x) => x[0] === id); if (!row || !hasG() || !G.player) return false;
    if (!(G.player.gold >= row[1])) return false;
    G.player.gold -= row[1]; G.give(id, 1);
    say(fmt(TX.list.bought, matName(id)), '', 3500);
    return true;
  }

  // the journey: what the Kestrel changes about a world-map journey begun at her table
  function travelMinutesFor(base) {
    if (!upHas('envelope')) return base;
    return Math.max(5, Math.round(base * B.ENV_TIME / 5) * 5);
  }
  function riskFactor() { return (crewHas('mags') ? 1 - B.MAGS_RISK : 1) * (upHas('chart') ? 1 - B.CHART_RISK : 1); }

  // Mags sees your face: she is facing you within the sight cone and near enough
  function magsSees(e, px, py) {
    if (!e) return false;
    const c = typeof Engine !== 'undefined' && Engine.cam ? Engine.cam : null;
    const x = px != null ? px : (c ? c.x : 0), y = py != null ? py : (c ? c.y : 0);
    const dx = x - e.x, dy = y - e.y, d = Math.hypot(dx, dy);
    if (d > B.SIGHT_R) return false;
    if (d < 0.001) return true;
    const f = Number.isFinite(e.facing) ? e.facing : 0;
    return (Math.cos(f) * dx + Math.sin(f) * dy) / d > B.SIGHT;
  }

  // ---------------------------------------------------------------- procedural stand-in art (canvas, painted once and cached)
  function paint(w, h, draw) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d', { willReadFrequently: true });
    draw(c, w, h);
    const id = c.getImageData(0, 0, w, h), u8 = id.data;
    for (let i = 0; i < w * h; i++) { const o = i * 4; if (u8[o + 3] < 100) u8[o + 3] = 0; else u8[o + 3] = 255; }
    return new Uint32Array(id.data.buffer);
  }
  function reg(name, w, h, draw) {
    if (typeof Engine === 'undefined' || !Engine.addSprite || (Engine.sprites && Engine.sprites[name])) return;
    Engine.addSprite(name, { w, h, data: paint(w, h, draw), hs: 1, cx: 0.5, dy: 0 });
  }
  const rect = (c, x, y, w, h, f) => { c.fillStyle = f; c.fillRect(x, y, w, h); };
  const ell = (c, x, y, rx, ry, f) => { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2); c.fillStyle = f; c.fill(); };
  const poly = (c, pts, f, s) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); c.fillStyle = f; c.fill(); if (s) { c.strokeStyle = s; c.lineWidth = 1; c.stroke(); } };
  const line = (c, x0, y0, x1, y1, col, lw) => { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.strokeStyle = col; c.lineWidth = lw || 1; c.stroke(); };
  const vg = (c, y0, y1, a, b) => { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };

  function paintAll() {
    reg('p16k_fill', 2, 2, () => {});   // blank: the carrier of a fill light, never seen
    // the ship's wheel on its post, brass hub, eight spokes, the rim worn pale where hands go
    reg('p16k_helm', 72, 104, (c) => {
      ell(c, 36, 98, 22, 4, 'rgba(0,0,0,0.35)');
      rect(c, 31, 52, 10, 46, vg(c, 52, 98, '#6a4c2c', '#3c2a18')); rect(c, 22, 94, 28, 5, '#3c2a18');
      ell(c, 36, 34, 30, 30, '#4a321c'); ell(c, 36, 34, 25, 25, '#00000000');
      c.save(); c.globalCompositeOperation = 'destination-out'; ell(c, 36, 34, 24, 24, '#000'); c.restore();
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; line(c, 36, 34, 36 + Math.cos(a) * 31, 34 + Math.sin(a) * 31, '#5a3e22', 3); ell(c, 36 + Math.cos(a) * 31, 34 + Math.sin(a) * 31, 2.6, 2.6, '#8a6a3a'); }
      c.beginPath(); c.arc(36, 34, 27, 0, Math.PI * 2); c.strokeStyle = '#6a4a28'; c.lineWidth = 3.6; c.stroke();
      c.beginPath(); c.arc(36, 34, 27, 3.6, 5.2); c.strokeStyle = '#c9a868'; c.lineWidth = 1.6; c.stroke();
      ell(c, 36, 34, 6, 6, '#c9a24a'); ell(c, 36, 34, 3, 3, '#7a5a1c'); ell(c, 34.5, 32.5, 1.6, 1.6, '#fff0b8');
    });
    // the map table: a chart under brass weights, a shaded lamp, a pencil
    reg('p16k_maptable', 136, 84, (c) => {
      ell(c, 68, 78, 56, 5, 'rgba(0,0,0,0.32)');
      rect(c, 12, 46, 6, 32, '#3e2c1a'); rect(c, 118, 46, 6, 32, '#3e2c1a'); rect(c, 26, 48, 4, 28, '#2e2012'); rect(c, 106, 48, 4, 28, '#2e2012');
      poly(c, [[6, 40], [130, 40], [122, 52], [14, 52]], vg(c, 40, 52, '#7a5a38', '#5a4028'), '#2a1c0e');
      poly(c, [[14, 52], [122, 52], [122, 58], [14, 58]], '#4a3320');
      poly(c, [[16, 41], [120, 41], [114, 50], [22, 50]], '#e4d9b4', '#8a7c52');
      line(c, 30, 45, 54, 43, 'rgba(90,60,30,0.7)', 1.2); line(c, 54, 43, 62, 47, 'rgba(90,60,30,0.7)', 1.2); line(c, 62, 47, 92, 44, 'rgba(90,60,30,0.7)', 1.2);
      ell(c, 74, 45, 7, 2.4, 'rgba(110,80,50,0.45)');
      for (const [bx, by] of [[22, 43], [114, 43], [28, 49], [108, 49]]) { ell(c, bx, by, 3.6, 2.4, '#b0903a'); ell(c, bx - 0.6, by - 0.6, 1.4, 1, '#f1dc96'); }
      rect(c, 96, 26, 3, 14, '#3a3226'); poly(c, [[88, 28], [107, 28], [102, 18], [93, 18]], '#9a7a3a', '#3a2a10'); ell(c, 97.5, 29, 6, 2, 'rgba(255,225,150,0.9)');
      line(c, 46, 47, 60, 44, '#3a2a14', 2);
    });
    // the new patch: a quilted panel of silver mesh and lilac silk hung from a spar, sewn in long laps
    reg('p16k_patch', 80, 124, (c) => {
      ell(c, 40, 118, 26, 3, 'rgba(0,0,0,0.25)');
      rect(c, 6, 4, 68, 5, '#5a4128'); rect(c, 4, 3, 4, 7, '#3c2a18'); rect(c, 72, 3, 4, 7, '#3c2a18');
      for (const x of [14, 40, 66]) line(c, x, 9, x, 20, '#8a7a58', 1.6);
      poly(c, [[10, 20], [70, 20], [66, 108], [14, 108]], vg(c, 20, 108, '#c9bfdc', '#9a90b8'), '#4a4260');
      for (let r = 0; r < 4; r++) for (let q = 0; q < 3; q++) {
        const x0 = 14 + q * 17 + (r % 2) * 5, y0 = 24 + r * 21;
        rect(c, x0, y0, 15, 19, (r + q) % 2 ? 'rgba(230,226,244,0.55)' : 'rgba(150,140,180,0.45)');
        for (let k = 0; k < 4; k++) line(c, x0 + 1, y0 + 2 + k * 4.5, x0 + 14, y0 + 2 + k * 4.5, 'rgba(70,64,100,0.5)', 0.8);
      }
      for (let r = 0; r < 5; r++) line(c, 12, 24 + r * 17, 68, 24 + r * 17, 'rgba(60,50,90,0.65)', 1.2);
      line(c, 20, 20, 18, 108, 'rgba(255,255,255,0.35)', 1.4);
    });
    // a burnished brass lift-tank with riveted bands, a gauge and a feed-pipe: the engineer's pride
    reg('p16k_tank_new', 96, 148, (c) => {
      ell(c, 48, 142, 36, 5, 'rgba(0,0,0,0.38)');
      rect(c, 10, 22, 76, 112, (() => { const g = c.createLinearGradient(10, 0, 86, 0); g.addColorStop(0, '#6a4a14'); g.addColorStop(0.35, '#e0b84e'); g.addColorStop(0.6, '#b98a2a'); g.addColorStop(1, '#4e340c'); return g; })());
      ell(c, 48, 22, 38, 9, '#d0a63e'); ell(c, 48, 22, 34, 6, '#8a6418');
      ell(c, 48, 134, 38, 8, '#6a4a14');
      for (const y of [40, 74, 108]) { rect(c, 8, y, 80, 7, '#7a5516'); rect(c, 8, y, 80, 2, '#f0d27a'); for (let x = 14; x < 86; x += 12) ell(c, x, y + 4, 1.6, 1.6, '#f6e6a4'); }
      line(c, 22, 30, 22, 126, 'rgba(255,248,210,0.5)', 3);
      ell(c, 48, 62, 12, 12, '#2a2010'); ell(c, 48, 62, 10, 10, '#f1ead2'); line(c, 48, 62, 54, 56, '#222', 1.6); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; line(c, 48 + Math.cos(a) * 8, 62 + Math.sin(a) * 8, 48 + Math.cos(a) * 9.5, 62 + Math.sin(a) * 9.5, '#222', 1); }
      rect(c, 44, 0, 8, 22, '#7a5516'); rect(c, 42, 0, 12, 4, '#c9a24a');
      rect(c, 80, 90, 14, 5, '#7a5516'); rect(c, 90, 82, 5, 12, '#7a5516');
    });
    // a cold iron stove: soot, a swept hearthstone, a pot hung on it, no fire
    reg('p16k_stove_cold', 80, 92, (c) => {
      ell(c, 40, 86, 30, 4, 'rgba(0,0,0,0.35)');
      rect(c, 10, 80, 60, 6, '#3a3630'); rect(c, 14, 36, 52, 46, vg(c, 36, 82, '#4a4742', '#23211e'));
      rect(c, 10, 30, 60, 8, '#34312c'); rect(c, 10, 30, 60, 2, '#6a665e');
      rect(c, 26, 50, 28, 22, '#16140f'); rect(c, 26, 50, 28, 3, '#5a564e'); rect(c, 22, 48, 4, 26, '#34312c'); rect(c, 54, 48, 4, 26, '#34312c');
      for (let i = 0; i < 5; i++) rect(c, 29 + i * 5, 62, 3, 9, '#2a2620');
      rect(c, 54, 6, 10, 26, '#34312c'); rect(c, 52, 4, 14, 4, '#4a4742');
      ell(c, 22, 26, 11, 4, '#1a1814'); rect(c, 12, 12, 20, 14, vg(c, 12, 26, '#3a3630', '#1c1a16')); ell(c, 22, 12, 10, 3, '#2a2824');
      line(c, 12, 14, 32, 14, '#6a665e', 1.2);
    });
    // a board of Reach timber with six brass pegs; the pegs themselves are separate props so a trophy can hang on each
    reg('p16k_railboard', 128, 44, (c) => {
      rect(c, 2, 8, 124, 28, vg(c, 8, 36, '#7a5a38', '#523a22')); rect(c, 2, 8, 124, 3, '#9a7a52'); rect(c, 2, 33, 124, 3, '#2e2012');
      for (let i = 0; i < 9; i++) line(c, 4, 12 + i * 2.6, 124, 12 + i * 2.6, 'rgba(40,28,14,0.25)', 0.8);
      for (const x of [6, 120]) { ell(c, x, 14, 2, 2, '#c9a24a'); ell(c, x, 30, 2, 2, '#c9a24a'); }
    });
    // pinned charts on a board
    reg('p16k_charts', 88, 92, (c) => {
      rect(c, 6, 4, 76, 80, vg(c, 4, 84, '#6a4c2c', '#46321c')); rect(c, 6, 4, 76, 3, '#8a6a42');
      poly(c, [[12, 12], [46, 10], [48, 52], [14, 54]], '#e4d9b4', '#8a7c52'); poly(c, [[50, 14], [78, 16], [76, 46], [52, 44]], '#d8cca4', '#8a7c52');
      poly(c, [[16, 58], [72, 56], [74, 78], [18, 80]], '#e8dfbe', '#8a7c52');
      line(c, 18, 40, 30, 28, 'rgba(90,60,30,0.7)', 1.2); line(c, 30, 28, 40, 34, 'rgba(90,60,30,0.7)', 1.2); line(c, 56, 24, 72, 36, 'rgba(90,60,30,0.7)', 1.2);
      line(c, 22, 66, 66, 64, 'rgba(90,60,30,0.6)', 1); line(c, 22, 72, 58, 71, 'rgba(90,60,30,0.6)', 1);
      for (const [x, y] of [[29, 28], [64, 30], [34, 38]]) { line(c, x - 2, y - 2, x + 2, y + 2, '#7a1e18', 1.4); line(c, x + 2, y - 2, x - 2, y + 2, '#7a1e18', 1.4); }
      for (const [x, y] of [[13, 11], [47, 9], [51, 13], [77, 15], [17, 57], [73, 55]]) ell(c, x, y, 1.6, 1.6, '#b0903a');
    });
    // a hammock slung hook to hook
    reg('p16k_hammock', 120, 76, (c) => {
      ell(c, 60, 70, 46, 4, 'rgba(0,0,0,0.25)');
      rect(c, 4, 6, 6, 16, '#3c2a18'); rect(c, 110, 6, 6, 16, '#3c2a18'); ell(c, 8, 14, 3, 3, '#8a7a58'); ell(c, 112, 14, 3, 3, '#8a7a58');
      c.beginPath(); c.moveTo(8, 14); c.quadraticCurveTo(60, 74, 112, 14); c.lineTo(112, 22); c.quadraticCurveTo(60, 84, 8, 22); c.closePath(); c.fillStyle = vg(c, 20, 70, '#a39a82', '#6e664e'); c.fill();
      c.strokeStyle = 'rgba(40,34,20,0.6)'; c.lineWidth = 1; c.stroke();
      for (let i = 0; i < 9; i++) line(c, 14 + i * 11, 22 + Math.sin(i / 8 * Math.PI) * 24, 16 + i * 11, 30 + Math.sin(i / 8 * Math.PI) * 22, 'rgba(40,34,20,0.35)', 1);
      poly(c, [[34, 44], [60, 52], [86, 44], [74, 40], [46, 40]], '#c9bfa0', '#6e664e');
    });
    // a striped waxed-canvas awning on two poles
    reg('p16k_awning', 144, 104, (c) => {
      ell(c, 72, 98, 54, 4, 'rgba(0,0,0,0.25)');
      rect(c, 12, 20, 5, 78, '#4a3420'); rect(c, 127, 20, 5, 78, '#4a3420');
      poly(c, [[4, 24], [140, 24], [128, 6], [16, 6]], '#8a8672', '#2e2a1c');
      for (let i = 0; i < 8; i++) poly(c, [[4 + i * 17, 24], [21 + i * 17, 24], [20 + i * 15.2 - 3, 6], [16 + i * 14 - 0.6, 6]], i % 2 ? '#5c6a5a' : '#b5b093');
      for (let i = 0; i < 9; i++) poly(c, [[4 + i * 17, 24], [4 + i * 17 + 17, 24], [4 + i * 17 + 8.5, 31]], i % 2 ? '#5c6a5a' : '#b5b093');
      line(c, 14, 22, 130, 22, 'rgba(0,0,0,0.3)', 1.4);
    });
    // a Light-glass lantern: a brass cage round a cyan core, faintly wet
    reg('p16k_glasslamp', 36, 64, (c) => {
      rect(c, 16, 0, 4, 10, '#6a5a38'); ell(c, 18, 11, 7, 3, '#8a7a4a');
      poly(c, [[9, 12], [27, 12], [30, 40], [6, 40]], 'rgba(120,230,232,0.9)', '#2a5a5e');
      ell(c, 18, 26, 6, 9, 'rgba(230,255,252,0.95)'); ell(c, 18, 26, 3, 5, '#ffffff');
      for (const x of [9, 18, 27]) line(c, x, 12, x + (x < 18 ? -3 : x > 18 ? 3 : 0), 40, '#8a7a4a', 1.4);
      ell(c, 18, 41, 12, 4, '#8a7a4a'); ell(c, 18, 41, 8, 2, '#4a3e22'); line(c, 11, 18, 10, 34, 'rgba(255,255,255,0.5)', 1.2);
    });
    // the repair list: a board on a stanchion, three sheets, one nail
    reg('p16k_board', 72, 100, (c) => {
      ell(c, 36, 94, 20, 3, 'rgba(0,0,0,0.3)');
      rect(c, 32, 40, 8, 56, vg(c, 40, 96, '#5a3e24', '#3a2816'));
      rect(c, 6, 4, 60, 56, vg(c, 4, 60, '#6a4c2c', '#46321c')); rect(c, 6, 4, 60, 2, '#8a6a42');
      poly(c, [[12, 10], [38, 9], [38, 40], [12, 41]], '#e4d9b4', '#8a7c52'); poly(c, [[40, 12], [62, 11], [62, 34], [40, 35]], '#ddd1a8', '#8a7c52');
      poly(c, [[16, 44], [58, 43], [58, 56], [16, 57]], '#e8dfbe', '#8a7c52');
      for (let i = 0; i < 7; i++) line(c, 15, 14 + i * 4, 35, 13.5 + i * 4, 'rgba(60,40,20,0.65)', 1);
      for (let i = 0; i < 4; i++) line(c, 43, 16 + i * 4, 59, 15.5 + i * 4, 'rgba(60,40,20,0.6)', 1);
      line(c, 19, 50, 55, 49, 'rgba(120,30,20,0.7)', 1.2);
      for (const [x, y] of [[25, 10], [51, 12], [37, 44]]) ell(c, x, y, 1.6, 1.6, '#2a2a2a');
    });
    // the companionway hatch: a coaming round a dark opening, a ladder going down
    reg('p16k_hatch', 112, 72, (c) => {
      ell(c, 56, 64, 46, 5, 'rgba(0,0,0,0.3)');
      poly(c, [[10, 34], [102, 34], [96, 62], [16, 62]], '#4a321c', '#2a1c0e');
      poly(c, [[20, 38], [92, 38], [88, 56], [24, 56]], vg(c, 38, 56, '#14100a', '#050403'));
      for (let i = 0; i < 4; i++) { rect(c, 40, 40 + i * 4, 32, 2, '#8a6a42'); }
      rect(c, 38, 36, 3, 22, '#6a4c2c'); rect(c, 71, 36, 3, 22, '#6a4c2c');
      poly(c, [[10, 34], [102, 34], [98, 40], [14, 40]], '#6a4a2a'); line(c, 10, 34, 102, 34, '#9a7a52', 1.4);
      ell(c, 18, 34, 2.4, 2.4, '#c9a24a'); ell(c, 94, 34, 2.4, 2.4, '#c9a24a');
    });
    // a sextant on a stand: brass arc, a glass sight
    reg('p16k_sextant', 52, 72, (c) => {
      ell(c, 26, 68, 14, 3, 'rgba(0,0,0,0.3)');
      rect(c, 23, 36, 6, 30, '#4a3420'); rect(c, 14, 62, 24, 5, '#3a2814');
      c.beginPath(); c.moveTo(8, 40); c.arc(26, 40, 20, Math.PI * 1.1, Math.PI * 1.9); c.lineTo(26, 40); c.closePath(); c.fillStyle = '#c9a24a'; c.fill(); c.strokeStyle = '#6a4c10'; c.lineWidth = 1.4; c.stroke();
      c.beginPath(); c.arc(26, 40, 16, Math.PI * 1.15, Math.PI * 1.85); c.strokeStyle = '#5a3c08'; c.lineWidth = 1; c.stroke();
      line(c, 26, 40, 40, 24, '#f1dc96', 1.6); ell(c, 40, 24, 3.4, 3.4, 'rgba(120,230,232,0.9)'); ell(c, 26, 40, 2.4, 2.4, '#7a5a1c');
    });
    // the mast: a tapered pole bound with rope at every knuckle, shrouds fanning to the deck, a block at the top
    reg('p16k_mast', 72, 240, (c) => {
      ell(c, 36, 234, 26, 4, 'rgba(0,0,0,0.35)');
      poly(c, [[30, 230], [42, 230], [40, 8], [32, 8]], (() => { const g = c.createLinearGradient(30, 0, 42, 0); g.addColorStop(0, '#4a3220'); g.addColorStop(0.45, '#8a6a44'); g.addColorStop(1, '#3a2616'); return g; })());
      for (let y = 20; y < 226; y += 26) { rect(c, 29 + (y / 240) * -0.5, y, 14, 4, '#a58a58'); line(c, 29, y + 1, 43, y + 3, 'rgba(60,44,20,0.7)', 1); }
      for (const [x1, x0] of [[2, 31], [70, 41], [10, 33], [62, 39]]) { line(c, x0, 24, x1, 232, 'rgba(70,56,34,0.9)', 1.6); }
      rect(c, 26, 4, 20, 7, '#3c2a18'); ell(c, 36, 8, 5, 3, '#6a5a38'); rect(c, 33, 10, 6, 10, '#2a2012');
      line(c, 31, 60, 31, 226, 'rgba(255,230,180,0.2)', 2);
    });
    // a coil of mooring rope
    reg('p16k_rope', 48, 28, (c) => {
      ell(c, 24, 24, 20, 3, 'rgba(0,0,0,0.3)');
      for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(24, 16 - i * 3, 17 - i, 7 - i * 0.6, 0, 0, Math.PI * 2); c.strokeStyle = i % 2 ? '#8a7448' : '#a58a58'; c.lineWidth = 3.4; c.stroke(); }
      ell(c, 24, 10, 6, 2.2, '#2a2012');
    });
  }

  // ---------------------------------------------------------------- textures: deck planking and the mist under the ship
  function paintTextures() {
    if (typeof Engine === 'undefined' || !Engine.addTexture || !Engine.textures) return;
    if (!Engine.textures.p16k_deck && Engine.textures.t_wood) {
      const src = Engine.textures.t_wood, d = new Uint32Array(src.length);
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
        const p = src[y * 64 + x]; let r = p & 255, g = (p >>> 8) & 255, b = (p >>> 16) & 255;
        const seam = y % 16 === 0, grain = ((x * 7 + y * 3) % 11) / 11;
        const k = seam ? 0.42 : 0.82 + grain * 0.12;
        r = r * k * 0.95; g = g * k * 0.92; b = b * k * 0.9;                 // tarred, then weathered grey
        if (!seam && (x + ((y >> 4) * 23)) % 41 === 0) { r *= 0.6; g *= 0.6; b *= 0.6; }   // a plank end-joint
        d[y * 64 + x] = (255 << 24) | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0);
      }
      Engine.addTexture('p16k_deck', d);
    }
    if (!Engine.textures.p16k_mist) {
      // lit mist seen from above: lilac, soft, brighter in slow blotches (the pools underlight it; Whisper-Grove's colour)
      const d = new Uint32Array(64 * 64), rnd = typeof mulberry32 === 'function' ? mulberry32(1604) : Math.random;
      const grid = []; for (let i = 0; i < 64; i++) grid.push(rnd());
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
        const n = 0.5 + 0.25 * Math.sin(x * 0.19 + grid[y % 64] * 2) + 0.25 * Math.sin(y * 0.23 + grid[x % 64] * 3);
        const r = 150 + n * 40, g = 128 + n * 36, b = 196 + n * 40;
        d[y * 64 + x] = (255 << 24) | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0);
      }
      Engine.addTexture('p16k_mist', d);
    }
  }

  // ---------------------------------------------------------------- the maps (deterministic: saved entity indexes stay aligned)
  // the deck: ship local coordinates (lx 0..27, ly 0..9, stern at 0, bow at 27) laid at OX,OY in a large field of lit mist
  const OX = 16, OY = 14, DW = 60, DH = 40;
  const hw = (lx) => (lx < 4 ? 2.0 + lx * 0.35 : lx <= 19 ? 4.5 : 4.5 - (lx - 19) * 0.5);
  const isDeckLocal = (lx, ly) => lx >= 0 && lx <= 27 && ly >= 0 && ly <= 9 && Math.abs(ly + 0.5 - 5) < hw(lx) + 0.01;
  const D = (lx, ly) => [OX + lx, OY + ly];            // ship-local to map coordinates
  // props on the deck, in ship-local coordinates (the report prints this layout)
  const DECK_AT = {
    helm: [2.3, 5.0], vane: [3.2, 6.7], table: [8.5, 2.9], ladder: [14.5, 1.0], hatch: [12.5, 6.2], mast: [18.5, 4.5],
    mags: [23.0, 5.0], arrive: [14.5, 2.2], rope: [6.4, 8.2], crates: [11.2, 8.3], lamp1: [5.5, 1.4], lamp2: [5.5, 8.6],
  };
  function buildDeck() {
    const m = new GameMap(DECK, TX.mapDeck, DW, DH, {
      outdoor: true, floor: 'p16k_deck', floorTextures: ['p16k_deck', 'p16k_mist', 'p16k_mist'], fogDist: 9, fogColor: [150, 132, 190], ambient: 0.42,
      music: 'grove', danger: 0, spawn: { x: OX + DECK_AT.arrive[0], y: OY + DECK_AT.arrive[1], dir: Math.PI / 2 },
    });
    m.floorCells.fill(2);
    for (let ly = 0; ly <= 9; ly++) for (let lx = 0; lx <= 27; lx++) if (isDeckLocal(lx, ly)) {
      const [x, y] = D(lx, ly);
      const edge = !isDeckLocal(lx - 1, ly) || !isDeckLocal(lx + 1, ly) || !isDeckLocal(lx, ly - 1) || !isDeckLocal(lx, ly + 1);
      if (edge) { m.setFloor(x, y, 2); m.block(x, y, 't_wood', 0.4); }   // the rail: a low wall you see over, mist beyond
      else m.setFloor(x, y, 0);
    }
    m.deco('p16k_mast', ...D(DECK_AT.mast[0], DECK_AT.mast[1]), { radius: 0.3, scale: 3.3, label: TX.deck.mast });   // the mast, stitched and re-stitched
    const at = (k) => D(DECK_AT[k][0], DECK_AT[k][1]);
    m.deco('p16k_helm', ...at('helm'), { radius: 0.3, scale: 0.9, label: TX.deck.helm });
    m.deco('p16k_maptable', ...at('table'), { radius: 0.7, scale: 1.0, use: 'p16k_table', label: TX.table.title });
    m.deco('ladder', ...at('ladder'), { radius: 0.25, scale: 1.5, use: 'p16k_exit', label: TX.board.ladderLabel });
    m.deco('p16k_hatch', ...at('hatch'), { radius: 0.5, scale: 1.0, solid: false, use: 'p16k_down', label: TX.board.hatchLabel });
    m.deco('p16k_rope', ...at('rope'), { radius: 0.2, scale: 0.55, solid: false, label: TX.deck.rope });
    m.deco('crates', ...at('crates'), { radius: 0.4, scale: 0.8, label: TX.deck.crates });
    m.deco('lamp', ...at('lamp1'), { radius: 0.12, scale: 0.7, glow: 0.55, label: TX.deck.lamp });
    m.deco('lamp', ...at('lamp2'), { radius: 0.12, scale: 0.7, glow: 0.55, label: TX.deck.lamp });
    m.baseCount = m.entities.length;
    return m;
  }

  // below-decks: tank room | mess and galley | bunk room over hold, with the companionway at the south wall of the mess
  const BW = 30, BH = 14;
  const BELOW_AT = {
    arrive: [12.6, 11.0], up: [11.5, 12.4], stove: [11.4, 1.7], shelf: [13.6, 1.3], table: [14.4, 5.6], nell: [12.7, 3.0],
    tankA: [2.4, 2.8], tankB: [2.4, 6.6], tankC: [2.4, 10.4], pennick: [5.4, 6.4], bench: [7.3, 2.6], gauge: [5.2, 1.15],
    bed: [27.1, 1.9], pim: [22.3, 3.4], nellBunk: [24.6, 3.6], hobBunk: [26.3, 3.9],
    chest: [27.6, 11.3], locker: [25.4, 8.4], board: [21.9, 10.6], hobBench: [27.1, 9.1], crateA: [22.4, 11.5], crateB: [23.9, 11.7], crateC: [22.2, 9.4],
    rail: [17.0, 12.82],
  };
  const RAIL_PEGS = [[15.2, 12.86], [15.95, 12.86], [16.7, 12.86], [17.45, 12.86], [18.2, 12.86], [18.95, 12.86]];
  function buildBelow() {
    const m = new GameMap(BELOW, TX.mapBelow, BW, BH, {
      floor: 'p16k_deck', ceil: 't_wood', fogDist: 15, fogColor: [0, 0, 0], ambient: B.AMB_BELOW, music: 'inside', danger: 0,
      spawn: { x: BELOW_AT.arrive[0], y: BELOW_AT.arrive[1], dir: -Math.PI / 2 },
    });
    m.border('t_wood');
    m.rect(9, 1, 9, 12, 't_wood'); m.clear(9, 6, 9, 7);                    // tank room | mess: a doorway two cells wide
    m.rect(20, 1, 20, 12, 't_wood'); m.clear(20, 2, 20, 3); m.clear(20, 9, 20, 10);   // mess | bunks, hold
    m.rect(21, 7, 28, 7, 't_wood'); m.clear(24, 7, 25, 7);                 // bunks | hold
    const at = (k) => BELOW_AT[k];
    m.deco('lifttank', ...at('tankA'), { radius: 0.7, scale: 1.4, label: TX.below.tankA });
    m.deco('lifttank', ...at('tankB'), { radius: 0.7, scale: 1.4, label: TX.below.tankB });
    m.deco('table', ...at('bench'), { radius: 0.5, scale: 0.7, label: TX.below.bench });
    m.deco('gear', ...at('gauge'), { radius: 0.1, scale: 0.35, solid: false, yOff: -0.3, label: TX.below.gauge });
    m.deco('lamp', 7.6, 11.4, { radius: 0.12, scale: 0.7, glow: 0.45, label: TX.deck.lamp });
    m.deco('lamp', 4.2, 1.5, { radius: 0.12, scale: 0.7, glow: 0.45, label: TX.deck.lamp });
    // mess and galley
    m.deco('shelf', ...at('shelf'), { radius: 0.2, scale: 0.9, label: TX.below.shelf });
    m.deco('table', ...at('table'), { radius: 0.55, scale: 0.8, label: TX.below.table });
    m.deco('chair', 12.8, 5.6, { radius: 0.3, scale: 0.6 }); m.deco('chair', 16.0, 5.6, { radius: 0.3, scale: 0.6 });
    m.deco('ladder', ...at('up'), { radius: 0.25, scale: 1.6, use: 'p16k_up', label: TX.board.upLabel });
    m.deco('lamp', 10.6, 8.4, { radius: 0.12, scale: 0.7, glow: 0.5, label: TX.deck.lamp });
    m.deco('lamp', 18.5, 8.4, { radius: 0.12, scale: 0.7, glow: 0.5, label: TX.deck.lamp });
    // bunk room
    m.deco('bed', ...at('bed'), { radius: 0.5, scale: 0.65, use: 'p16k_bed', label: TX.bed.label });
    m.deco('p16k_hammock', 23.3, 1.5, { radius: 0.5, scale: 0.7, label: TX.below.hammock });
    m.deco('lamp', 21.7, 1.6, { radius: 0.12, scale: 0.7, glow: 0.4, label: TX.deck.lamp });
    // hold
    m.deco('chest', ...at('chest'), { radius: 0.4, scale: 0.7, use: 'house_chest', label: TX.chest });
    m.deco('crates', ...at('locker'), { radius: 0.4, scale: 0.8, use: 'p16k_locker', label: TX.below.locker });
    m.deco('p16k_board', ...at('board'), { radius: 0.3, scale: 0.9, use: 'p16k_list', label: TX.below.board });
    m.deco('crates', ...at('crateA'), { radius: 0.4, scale: 0.8, label: TX.below.crates });
    m.deco('crates', ...at('crateB'), { radius: 0.4, scale: 0.8, label: TX.below.crates });
    m.deco('crates', ...at('crateC'), { radius: 0.4, scale: 0.8, label: TX.below.crates });
    m.deco('lamp', 27.6, 8.6, { radius: 0.12, scale: 0.7, glow: 0.4, label: TX.deck.lamp });
    // two more lamps (Phase 16 polish): the tank room and the back of the hold were the darkest corners aboard.
    // Appended last, so every earlier entity keeps its index.
    m.deco('lamp', 8.6, 4.4, { radius: 0.12, scale: 0.7, glow: 0.45, label: TX.deck.lamp });
    m.deco('lamp', 25.9, 12.4, { radius: 0.12, scale: 0.7, glow: 0.4, label: TX.deck.lamp });
    m.deco('lamp', 25.2, 1.3, { radius: 0.12, scale: 0.7, glow: 0.4, label: TX.deck.lamp });
    m.baseCount = m.entities.length;
    return m;
  }

  // ---------------------------------------------------------------- crew: who is aboard, where, and what they ask
  const pimHere = () => hasG() && !!G.flags.pim_safe;
  const here = (id) => {            // is this person aboard at all?
    if (id === 'nell') return pimHere();
    if (id === 'hob') return hasG() && !!G.flags.twins_named;
    return shipExists();
  };
  // Mags: the original mags_dw stands at the Deep Woods camp from Part Four on (js/maps.js: no requires/until, and the
  // camp is only reachable from Part Four). Then she is not on the deck; her lens offer is made at the camp instead.
  const magsAtCamp = () => hasG() && !!G.flags.part4;
  // [PROPOSED] conditions, all from flags the story already sets
  function recruitCheck(id) {
    if (!hasG() || !shipExists() || !here(id)) return { ok: false, why: 'absent' };
    if (crewHas(id)) return { ok: false, why: 'done' };
    if (id === 'mags') return G.player && G.player.gold >= B.LENS ? { ok: true } : { ok: false, why: 'gold' };
    if (id === 'pennick') return !G.flags.tank_patched ? { ok: false, why: 'early' } : !upHas('envelope') ? { ok: false, why: 'envelope' } : { ok: true };
    if (id === 'nell') return upHas('stove') ? { ok: true } : { ok: false, why: 'stove' };
    if (id === 'hob') return upHas('lamps') ? { ok: true } : { ok: false, why: 'lamps' };
    return { ok: false, why: 'unknown' };
  }
  function hire(id) {
    const r = recruitCheck(id); if (!r.ok) return r;
    if (id === 'mags') G.player.gold -= B.LENS;
    const i = CREW.indexOf(id);
    fset('p16k_crew', fint('p16k_crew') | (1 << i));
    try { journal('side', TX.crew[id].j); } catch (e) { /* no journal yet */ }
    say(TX.crew[id].doneMsg, 'good', 8000);
    refresh();
    return { ok: true };
  }
  const pick = (arr, salt) => arr[(today() + salt) % arr.length];
  const dailyLine = (id, salt) => pick(TX.crew[id].d, salt);

  function giveLoaf() {
    const N = TX.crew.nell;
    if (fint('p16k_loaf') === today() + 1) return N.loafNone;
    fset('p16k_loaf', today() + 1);
    try { G.give('p12_hearth_bread', B.LOAF); } catch (e) { /* the item not defined */ }
    return N.loafGot;
  }
  function mendWeapon() {
    const H = TX.crew.hob, p = G.player;
    const wk = p && Array.isArray(p.weapons) ? p.weapons[p.weapon] : null;
    if (!wk || typeof WEAPONS === 'undefined' || !WEAPONS[wk] || WEAPONS[wk].innate) return H.mendNoWeapon;
    if (fint('p16k_mend') === today() + 1) return H.mendNone;
    fset('p16k_mend', today() + 1);
    if (!p.weapCond || typeof p.weapCond !== 'object') p.weapCond = {};
    p.weapCond[wk] = Math.min(100, (typeof getWeaponCond === 'function' ? getWeaponCond(wk) : 100) + B.MEND);
    return H.mendGot;
  }

  const NO = (t) => ({ t, f: null });
  const NPC_DEFS = {
    p16k_vane: {
      name: TX.crew.vane.name, sprite: 'vane', portrait: 'vane', tier: 'high',
      greet: { polite: TX.crew.vane.greetP, normal: TX.crew.vane.greetN, blunt: TX.crew.vane.greetB },
      topics: { 'The Drift-Kestrel': TX.crew.vane.tShip, 'The Catalogue': TX.crew.vane.tTopic },
      quest: () => {
        if (!shipExists()) return null;
        if (!seenHas(1)) { seenSet(1); return { text: TX.crew.vane.first }; }
        const pool = TX.crew.vane.d.slice();
        for (const u of UPG) if (upHas(u.id)) pool.push(TX.up[u.id].remark);
        return { text: pool[today() % pool.length] };
      },
    },
    p16k_mags: {
      name: TX.crew.mags.name, sprite: 'mags', portrait: 'mags', tier: 'high',
      greet: { polite: TX.crew.mags.greetP, normal: TX.crew.mags.greetN, blunt: TX.crew.mags.greetB },
      topics: { 'The Drift-Kestrel': TX.crew.mags.tShip, 'The Hush': TX.crew.mags.tTopic },
      quest: () => {
        if (!shipExists()) return null;
        const M = TX.crew.mags;
        if (crewHas('mags')) return { text: dailyLine('mags', 0) };
        const first = !seenHas(2); seenSet(2);
        return { text: first ? M.intro + '<br>' + M.offer : M.offer, choices: [
          { t: M.pay, f: () => { const r = hire('mags'); return r.ok ? M.done : M.short; } },
          NO(M.later),
        ] };
      },
    },
    p16k_pennick: {
      name: TX.crew.pennick.name, sprite: 'p16k_pennick', portrait: 'townsman', tier: 'high',
      greet: { polite: TX.crew.pennick.greetP, normal: TX.crew.pennick.greetN, blunt: TX.crew.pennick.greetB },
      topics: { 'The Drift-Kestrel': TX.crew.pennick.tShip, 'Aether-Glass': TX.crew.pennick.tTopic },
      quest: () => {
        if (!shipExists()) return null;
        const P = TX.crew.pennick;
        seenSet(3);
        if (crewHas('pennick')) return { text: dailyLine('pennick', 1) };
        const r = recruitCheck('pennick');
        if (!r.ok) return { text: r.why === 'early' ? P.early : P.patched };
        return { text: P.offer, choices: [{ t: P.take, f: () => { hire('pennick'); return P.done; } }, NO(TX.crew.mags.later)] };
      },
    },
    p16k_nell: {
      name: TX.crew.nell.name, sprite: 'nell', portrait: 'nell', tier: 'low',
      greet: { polite: TX.crew.nell.greetP, normal: TX.crew.nell.greetN, blunt: TX.crew.nell.greetB },
      topics: { 'The Drift-Kestrel': TX.crew.nell.tShip, 'Oakhaven': TX.crew.nell.tTopic },
      quest: () => {
        if (!shipExists() || !pimHere()) return null;
        const N = TX.crew.nell;
        seenSet(4);
        if (crewHas('nell')) return { text: dailyLine('nell', 2), choices: [{ t: N.loaf, f: () => giveLoaf() }, NO(N.later)] };
        if (!upHas('stove')) return { text: N.wantStove };
        return { text: N.offer, choices: [{ t: N.give, f: () => { hire('nell'); return N.done; } }, NO(N.later)] };
      },
    },
    p16k_hob: {
      name: TX.crew.hob.name, sprite: 'hob', portrait: 'hob', tier: 'low',
      greet: { polite: TX.crew.hob.greetP, normal: TX.crew.hob.greetN, blunt: TX.crew.hob.greetB },
      topics: { 'The Drift-Kestrel': TX.crew.hob.tShip, 'The Hedge': TX.crew.hob.tTopic },
      quest: () => {
        if (!shipExists() || !(hasG() && G.flags.twins_named)) return null;
        const H = TX.crew.hob;
        seenSet(5);
        if (crewHas('hob')) return { text: dailyLine('hob', 3), choices: [{ t: H.mend, f: () => mendWeapon() }, NO(H.later)] };
        if (!upHas('lamps')) return { text: H.wantLamp };
        return { text: H.offer, choices: [{ t: H.give, f: () => { hire('hob'); return H.done; } }, NO(H.later)] };
      },
    },
  };
  function installNpc() {
    if (typeof NPCS === 'undefined') return;
    for (const k in NPC_DEFS) if (!NPCS[k]) NPCS[k] = NPC_DEFS[k];
    // wrap, never edit: when the camp Mags has no story beat to give, she makes the lens offer one-handed (sling)
    const md = NPCS.mags_dw;
    if (md && typeof md.quest === 'function' && !md.quest._p16k) {
      const q = md.quest;
      md.quest = function (g) {
        const r = q.apply(this, arguments);
        try {
          if (r || !cfg.on || !shipExists() || crewHas('mags') || !(hasG() && G.flags.mags_met)) return r;
          const M = TX.crew.mags; seenSet(2);
          return { text: M.camp + '<br>' + M.offer, choices: [{ t: M.pay, f: () => { const h = hire('mags'); return h.ok ? M.done : M.short; } }, NO(M.later)] };
        } catch (e) { return r; }
      };
      md.quest._p16k = true;
    }
  }
  // the engineer: the townsman, recoloured to engineer's blue-grey with the goggles pushed up (derived from the existing sprite)
  function paintPennick() {
    if (typeof Engine === 'undefined' || !Engine.addSprite || !Engine.sprites || Engine.sprites.p16k_pennick || !Engine.sprites.townsman) return;
    const src = Engine.sprites.townsman, d = new Uint32Array(src.data.length);
    for (let i = 0; i < d.length; i++) {
      const p = src.data[i]; if ((p >>> 24) < 100) { d[i] = 0; continue; }
      let r = p & 255, g = (p >>> 8) & 255, b = (p >>> 16) & 255;
      r *= 0.7; g *= 0.86; b *= 1.04;
      d[i] = ((p >>> 24) << 24 | (Math.min(255, b | 0) << 16) | (Math.min(255, g | 0) << 8) | (r | 0)) >>> 0;
    }
    // goggles on the forehead: two brass-rimmed lenses
    const w = src.w, h = src.h;
    for (const cx of [Math.round(w * 0.42), Math.round(w * 0.58)]) for (let dy = -2; dy <= 2; dy++) for (let dx = -3; dx <= 3; dx++) {
      if (dx * dx / 9 + dy * dy / 4 > 1.1) continue;
      const y = Math.round(h * 0.15) + dy, x = cx + dx; if (x < 0 || y < 0 || x >= w || y >= h) continue;
      d[y * w + x] = (dx * dx / 9 + dy * dy / 4 > 0.55) ? 0xff2c88b0 : 0xffd8e6e0;
    }
    Engine.addSprite('p16k_pennick', Object.assign({}, src, { data: d }));
  }

  // ---------------------------------------------------------------- furnishing: everything that changes with state is TRANSIENT
  // (never saved, rebuilt from the flags on every entry and after every purchase)
  const H15 = () => (typeof HEARTH15 !== 'undefined' && HEARTH15 && HEARTH15.cfg && HEARTH15.TX && HEARTH15.TX.trophy ? HEARTH15 : null);
  function railState() {
    const h = H15(), out = [null, null, null, null, null, null];
    if (!h || !h.cfg.trophies || !hasG()) return out;
    let homed = {}, n = 0;
    try { homed = h.placedMap().byTrophy; n = h.TX.trophy.items.length; } catch (e) { return out; }
    const seen = {};
    for (let i = 0; i < 6; i++) {
      const k = fint('p16k_rp' + i) - 1;
      if (k < 0 || k >= n || !h.isGot(k) || homed[k] != null || seen[k]) continue;
      seen[k] = 1; out[i] = k;
    }
    return out;
  }
  function hangRail(k, i) {
    const h = H15();
    if (!h || !h.cfg.trophies || !upHas('rail') || !Number.isInteger(k) || !Number.isInteger(i) || i < 0 || i > 5 || k < 0 || k >= h.TX.trophy.items.length) return false;
    const st = railState(), homed = h.placedMap().byTrophy;
    if (st[i] != null || st.indexOf(k) >= 0 || homed[k] != null || !h.isGot(k) || !G.has(h.trophyId(k))) return false;
    G.take(h.trophyId(k)); fset('p16k_rp' + i, k + 1);
    refresh();
    say(h.TX.trophy.items[k].hung, 'good', 6500);
    return true;
  }
  function takeRail(i) {
    const h = H15(); if (!h || !Number.isInteger(i) || i < 0 || i > 5) return false;
    const k = railState()[i]; if (k == null) return false;
    fset('p16k_rp' + i, 0); G.give(h.trophyId(k));
    refresh();
    return true;
  }
  function railMenu(e) {
    const h = H15(); if (!h || !h.cfg.trophies || typeof showEvent !== 'function') return;
    const T = h.TX.trophy, i = e._pi, k = railState()[i];
    if (k != null) { showEvent(T.items[k].name, T.items[k].desc, [{ t: T.takeDown, f: () => takeRail(i) }, { t: T.leaveHung, f: null }]); return; }
    const list = h.carried();
    if (!list.length) { say(T.none, '', 4800); return; }
    const page = (start) => {
      const slice = list.slice(start, start + 5), ch = slice.map((kk) => ({ t: T.items[kk].name, f: () => hangRail(kk, i) }));
      if (list.length > 5) ch.push({ t: T.more, f: () => setTimeout(() => page((start + 5) % list.length), 0) });
      ch.push({ t: T.leaveBare, f: null });
      showEvent(T.pegTitle, T.pegAsk, ch);
    };
    page(0);
  }

  // positions of the dynamic props: [x, y] in map coordinates
  const GL_BELOW = [[10.3, 3.8], [19.5, 3.8], [8.6, 9.8], [21.4, 9.7]];
  const GL_DECK = [D(9.6, 1.4), D(21.0, 8.4)];
  const BUNKS = [[22.2, 5.5], [24.3, 5.6], [26.2, 5.6], [27.5, 4.9]];
  const settle = (e) => { e._h = true; e.homeX = e.x; e.homeY = e.y; e.wanderT = 0; e.dir = 0; return e; };   // as tavern11: hydrate() would draw Math.random
  // Cinematic's indoor depth haze and contrast read darker than Medium below-decks, and the torch-lit interiors pass
  // (js/lighting.js) lifts only what a light reaches: so in Cinematic each dark room gets an unseen warm fill light
  // (a transient, unpickable deco with a blank sprite and a lightCol). Medium and Original are untouched.
  const cineOn = () => typeof GFX !== 'undefined' && (GFX.cineFog === true || GFX.cineGrade === true);
  const FILL_BELOW = [[5.0, 6.6], [24.6, 3.6], [24.4, 10.4], [14.6, 10.6]];
  let cineWas = null;
  function belowAmbient() { return B.AMB_BELOW + (upHas('lamps') ? B.AMB_LAMPS : 0); }
  function furnish(m) {
    if (!m || !Array.isArray(m.entities) || MAPS.indexOf(m.id) < 0) return;
    for (let i = m.entities.length - 1; i >= 0; i--) if (m.entities[i] && m.entities[i]._p16k) m.entities.splice(i, 1);
    const own = m.id === DECK ? DECK : BELOW;
    if (own === BELOW) m.ambient = belowAmbient();
    if (own === DECK) { m.music = mooring() === 'deepwoods' ? 'coda' : 'grove'; }
    // the ladder says where it goes
    for (const e of m.entities) if (e.use === 'p16k_exit') e.label = fmt(TX.board.ladderLabel, mooring() === 'deepwoods' ? TX.board.toCamp : TX.board.toCourt);
    if (!cfg.on || !shipExists()) return;
    const add = (o, tag) => { const e = Object.assign({ transient: true, _decor: true, _p16k: tag }, o); m.entities.push(e); return e; };
    const prop = (sprite, x, y, tag, o) => add(Object.assign({ kind: 'deco', sprite, x, y, solid: false, radius: 0.2 }, o || {}), tag);
    const person = (id, x, y, facing, tag, o) => {
      if (typeof NPCS === 'undefined' || !NPCS[id]) return null;
      return settle(add(Object.assign({ kind: 'npc', id, x, y, sprite: NPCS[id].sprite, scale: NPCS[id].scale || 1, solid: true, radius: 0.35, facing }, o || {}), tag));
    };
    if (own === DECK) {
      if (upHas('envelope')) prop('p16k_patch', ...D(17.0, 3.2), 'u_envelope', { scale: 0.95, label: TX.deck.patch });
      if (upHas('lamps')) for (const [x, y] of GL_DECK) prop('p16k_glasslamp', x, y, 'u_lamps', { scale: 0.55, glow: 0.8, glassLamp: true, label: TX.deck.glass });
      if (upHas('chart')) {
        prop('p16k_awning', ...D(8.5, 2.1), 'u_chart', { scale: 1.25, yOff: -0.05, label: TX.deck.awning });
        prop('p16k_charts', ...D(10.9, 1.5), 'u_chart', { scale: 0.7, solid: true, radius: 0.25, label: TX.deck.charts });
        prop('p16k_sextant', ...D(6.7, 2.6), 'u_chart', { scale: 0.55, solid: true, radius: 0.2, label: TX.deck.sextant });
      }
      person('p16k_vane', ...D(DECK_AT.vane[0], DECK_AT.vane[1]), Math.PI, 'crew_vane', { label: TX.crew.vane.label });
      // never two Mags: from Part Four on she is at the Deep Woods camp (mags_dw, js/maps.js), so the deck has her glass instead
      if (!magsAtCamp()) person('p16k_mags', ...D(DECK_AT.mags[0], DECK_AT.mags[1]), 0, 'crew_mags', { label: TX.crew.mags.label });
      else prop('p16k_sextant', ...D(DECK_AT.mags[0], DECK_AT.mags[1]), 'mags_away', { scale: 0.5, solid: true, radius: 0.2, label: TX.deck.magsAway });
      return;
    }
    // below-decks
    cineWas = cineOn();
    if (cineWas) for (const [x, y] of FILL_BELOW) add({ kind: 'deco', sprite: 'p16k_fill', x, y, solid: false, radius: 0.05, nopick: true, lightCol: B.FILL }, 'fill');
    if (upHas('stove')) {
      const s = prop('hearth', ...BELOW_AT.stove, 'u_stove', { scale: 0.9, solid: true, radius: 0.3, glow: 0.85, label: TX.below.stove });
      const h = H15(); if (h && h.cfg.cook) { s.use = 'p15_cook'; s._p15h = 'hearth'; }
    } else prop('p16k_stove_cold', ...BELOW_AT.stove, 'stove_cold', { scale: 0.9, solid: true, radius: 0.3, label: TX.below.stoveCold });
    if (upHas('lamps')) for (const [x, y] of GL_BELOW) prop('p16k_glasslamp', x, y, 'u_lamps', { scale: 0.55, glow: 0.8, glassLamp: true, label: TX.below.lantern });
    if (upHas('bunks')) for (const [x, y] of BUNKS) prop('bed', x, y, 'u_bunks', { scale: 0.55, solid: true, radius: 0.4, label: TX.below.bunkNew });
    if (upHas('tank')) prop('p16k_tank_new', ...BELOW_AT.tankC, 'u_tank', { scale: 1.45, solid: true, radius: 0.7, label: TX.below.tankC });
    if (upHas('rail')) {
      prop('p16k_railboard', ...BELOW_AT.rail, 'u_rail', { scale: 0.62, yOff: -0.34, label: TX.below.railBoard });
      const st = railState(), h = H15();
      RAIL_PEGS.forEach(([x, y], i) => {
        const k = st[i];
        prop(k != null && h ? 'p15_t_' + h.TX.trophy.items[k].key : 'p15_peg', x, y, 'u_rail', {
          scale: k != null ? 0.5 : 0.24, yOff: -0.42 + (k != null ? -0.06 : 0.04), use: 'p16k_peg', _pi: i,
          label: k != null && h ? h.TX.trophy.items[k].name : TX.below.pegBare,
        });
      });
    }
    // people
    if (here('pennick')) person('p16k_pennick', ...BELOW_AT.pennick, -Math.PI / 2, 'crew_pennick', { label: TX.crew.pennick.label });
    if (here('nell')) {
      const cooks = crewHas('nell');
      const p = cooks ? [BELOW_AT.nell[0], BELOW_AT.nell[1]] : BELOW_AT.nellBunk;
      person('p16k_nell', p[0], p[1], cooks ? -Math.PI / 2 : Math.PI, 'crew_nell', { label: TX.crew.nell.label });
      if (pimHere() && NPCS.pim) person('pim', ...BELOW_AT.pim, 0, 'crew_pim', { scale: 0.75 });
    }
    if (here('hob')) {
      const bench = crewHas('hob');
      const p = bench ? BELOW_AT.hobBench : BELOW_AT.hobBunk;
      person('p16k_hob', p[0], p[1], bench ? Math.PI : 0, 'crew_hob', { label: TX.crew.hob.label });
      if (bench) prop('table', 27.2, 10.0, 'hob_bench', { scale: 0.6, solid: true, radius: 0.4, label: TX.crew.hob.label });
    }
  }
  function refresh() {
    if (typeof G === 'undefined' || !G.maps) return;
    for (const id of MAPS) if (G.maps[id]) furnish(G.maps[id]);
  }

  // ---------------------------------------------------------------- boarding, leaving, the stair
  function boardBlock() {
    if (!hasG() || !G.player || G.dead) return TX.board.fight;
    const f = G.flags;
    if ((f.wg_ambush && !f.wg_ambush_over) || f.coda_go || f.escapeTimer > 0) return TX.board.fight;
    const c = typeof Engine !== 'undefined' && Engine.cam ? Engine.cam : { x: 0, y: 0 };
    if (G.ents && G.ents.some((o) => o && o.kind === 'enemy' && !o.dead && !o.hidden && o.state === 'chase' && Math.hypot(o.x - c.x, o.y - c.y) < B.CHASE)) return TX.board.chased;
    return null;
  }
  function board() {
    if (!cfg.on || !shipExists()) return false;
    const why = boardBlock(); if (why) { say(why, 'warn', 4500); return false; }
    const first = !seenHas(0);
    fset('p16k_visits', fint('p16k_visits') + 1);
    refresh();
    loadMap(DECK, { x: OX + DECK_AT.arrive[0], y: OY + DECK_AT.arrive[1], dir: Math.PI / 2 });
    if (first) { seenSet(0); say(TX.board.first, '', 8000); try { journal('side', TX.board.journalFirst); } catch (e) { /* no journal */ } }
    return true;
  }
  function leaveShip() {
    const L = landing();
    stopSounds();
    loadMap(L.map, { x: L.x, y: L.y, dir: L.dir });
    say(L.map === 'whispergrove' ? TX.board.arriveCourt : TX.board.arriveCamp, '', 6000);
    return true;
  }
  function goBelow() { loadMap(BELOW, { x: BELOW_AT.arrive[0], y: BELOW_AT.arrive[1], dir: -Math.PI / 2 }); }
  function goDeck() { loadMap(DECK, { x: OX + DECK_AT.hatch[0] - 1.1, y: OY + DECK_AT.hatch[1], dir: Math.PI }); }
  // the two ways in: the mast-ladder at Whisper-Grove, the cargo hatch at the Deep Woods camp
  function boardMenu(kind, orig) {
    if (typeof showEvent !== 'function') return;
    const T = TX.board;
    if (kind === 'wg') {
      const ch = [{ t: T.up, f: () => board() }];
      if (hasG() && G.flags.part3 && !G.flags.part4 && orig) ch.push({ t: T.on, f: () => setTimeout(orig, 0) });
      ch.push(NO(T.no));
      showEvent(T.wgTitle, magsAtCamp() ? T.wgBodyAway : T.wgBody, ch);
    } else showEvent(T.dwTitle, T.dwBody, [{ t: T.dwUp, f: () => board() }, NO(T.dwNo)]);
  }

  // ---------------------------------------------------------------- the bed: safe rest (the id says "kestrel", so js/night13.js never sends a terror here)
  function rest() {
    if (!hasG() || !G.player) return false;
    const p = G.player, hours = upHas('lamps') ? B.LAMP_HOURS : B.REST_HOURS;
    passHours(hours);
    const gain = typeof needsRecovery === 'function' ? needsRecovery() : 1, cap = typeof fatCap === 'function' ? fatCap() : p.fatMax;
    p.hp = Math.min(p.hpMax, p.hp + (p.hpMax - p.hp) * gain);
    p.voice = Math.min(p.voiceMax, p.voice + (p.voiceMax - p.voice) * gain);
    p.fat = cap;
    try { if (typeof needsOn === 'function' && needsOn()) { p.sleep = 100; p.hunger = clamp(p.hunger + hours * 2, 0, 100); } } catch (e) { /* needs are optional */ }
    try { if (typeof UPG !== 'undefined' && UPG.status) { UPG.status.bleed = 0; UPG.status.deaf = 0; UPG.status.hushed = 0; UPG.status.fear = 0; } } catch (e) { /* no status */ }
    let mended = false;
    if (upHas('bunks')) { p.injuries = []; mended = true; }
    G.noise = 2; G.stillT = 0;
    fset('p16k_rest', fint('p16k_rest') + 1);
    say(fmt(TX.bed.slept, hours) + (mended ? ' ' + TX.bed.mended : ''), 'good', 7000);
    try { Audio_.sfx.ui(); } catch (e) { /* silent */ }
    return true;
  }

  // ---------------------------------------------------------------- the map table: journeys, and the hop
  function hopAllowed() { return upHas('tank') && !!(hasG() && G.flags.coda_done) && !G.flags.coda_go; }
  function hop(to) {
    if (!cfg.on || !hasG()) return { ok: false, why: 'off' };
    if (!upHas('tank')) return { ok: false, why: 'tank' };
    if (!G.flags.coda_done || G.flags.coda_go) return { ok: false, why: 'coda' };
    if (to !== 'whispergrove' && to !== 'deepwoods') return { ok: false, why: 'bad' };
    if (mooring() === to) return { ok: false, why: 'same' };
    fset('p16k_moor', to === 'whispergrove' ? 1 : 2);
    passHours(B.HOP_HOURS);
    refresh();
    say(to === 'whispergrove' ? TX.table.hopMsgCourt : TX.table.hopMsgCamp, 'good', 8000);
    return { ok: true, to };
  }
  function tableMenu() {
    if (typeof showEvent !== 'function') return;
    const T = TX.table, ch = [{ t: T.plan, f: () => { if (typeof travelOpen === 'function') travelOpen(); } }];
    if (upHas('tank')) {
      const other = mooring() === 'deepwoods' ? 'whispergrove' : 'deepwoods';
      ch.push({ t: other === 'whispergrove' ? T.flyCourt : T.flyCamp, f: () => { if (!hopAllowed()) { say(T.hopWait, 'warn', 6000); return; } hop(other); } });
    }
    ch.push(NO(T.back));
    showEvent(T.title, T.body + (crewHas('mags') ? '<br>' + T.mags : ''), ch);
  }

  // ---------------------------------------------------------------- the repair list and the chandler's locker
  function openList() {
    if (typeof openModal !== 'function' || !hasG() || !G.player) return;
    G.state = 'panel';
    const L = TX.list, p = G.player;
    const rows = UPG.map((u) => {
      const t = TX.up[u.id], c = costOf(u.id), r = canFit(u.id);
      const mats = c.mats.map(([m, n]) => n + ' × ' + esc(matName(m)) + ' (' + haveMat(m) + ')').join(', ');
      let note = '';
      if (r.why === 'req') note = '<br><span class="muted">' + esc(fmt(L.need, r.req.map((k) => L[k]).join(', '))) + '</span>';
      else if (r.why === 'gold') note = '<br><span class="muted">' + esc(L.noGold) + '</span>';
      else if (r.why === 'mats') note = '<br><span class="muted">' + esc(L.noMats) + '</span>';
      const state = r.why === 'done' ? '<b>' + esc(L.fitted) + '</b>' : '<button class="dfbtn small" data-fit="' + u.id + '"' + (r.ok ? '' : ' disabled') + '>' + esc(L.fit) + '</button>';
      return '<tr><td><b>' + esc(t.name) + '</b><br><span class="muted">' + esc(t.desc) + '</span><br><span class="muted">' + esc(fmt(L.cost, c.gold)) + (c.mats.length ? ' + ' + mats : '') + '</span>' + (r.why === 'done' ? '' : note) + '</td><td class="n">' + state + '</td></tr>';
    }).join('');
    const lock = LOCKER.map(([id, price]) => '<tr><td>' + esc(matName(id)) + ' <span class="muted">(' + haveMat(id) + ') · ' + esc(fmt(L.cost, price)) + '</span></td><td class="n"><button class="dfbtn small" data-buy="' + id + '"' + (p.gold >= price ? '' : ' disabled') + '>' + esc(L.buy) + '</button></td></tr>').join('');
    openModal('<h2>' + esc(L.title) + '</h2><button class="dfbtn small close" id="x">' + esc(L.close) + '</button>'
      + '<p class="muted">' + esc(L.intro) + '</p><p>' + esc(fmt(L.purse, Math.floor(p.gold))) + (crewHas('pennick') ? ' <span class="muted">' + esc(L.disc) + '</span>' : '') + '</p>'
      + '<table class="p16k-t">' + rows + '</table><h3>' + esc(L.lockerTitle) + '</h3><p class="muted">' + esc(L.lockerHint) + '</p><table class="p16k-t">' + lock + '</table>', 'p16k_list');
    const token = G.panelToken, valid = () => G.panelToken === token && G.openPanel === 'p16k_list' && G.state === 'panel';
    const x = document.getElementById('x'); if (x) x.onclick = () => { closeModal(); G.state = 'play'; G.keys = {}; };
    document.querySelectorAll('[data-fit]').forEach((b) => { b.onclick = () => { if (!valid()) return; fit(b.getAttribute('data-fit')); openList(); }; });
    document.querySelectorAll('[data-buy]').forEach((b) => { b.onclick = () => { if (!valid()) return; buyMaterial(b.getAttribute('data-buy')); openList(); }; });
  }

  // ---------------------------------------------------------------- sound: the one note, and its caption
  const audioOk = () => { try { return typeof Audio_ !== 'undefined' && Audio_.ctx && Audio_.sfxBus && !Audio_.muted; } catch (e) { return false; } };
  const T = { hum: 0, capAt: -1e9, turnT: 0, away: 0, sayAt: -1e9, last: null };
  function capLine(text) {
    try {
      if (typeof ACCESS === 'undefined' || !ACCESS.settings || !ACCESS.settings.cap) return;
      let box = document.getElementById('ac-captions');
      if (!box) { const g = document.getElementById('game'); if (!g) return; box = document.createElement('div'); box.id = 'ac-captions'; box.setAttribute('role', 'log'); box.setAttribute('aria-live', 'polite'); box.setAttribute('aria-label', 'Sound captions'); g.appendChild(box); }
      const d = document.createElement('div'); d.textContent = text; box.appendChild(d);
      while (box.children.length > 4) box.removeChild(box.firstChild);
      setTimeout(() => { if (d.parentNode) d.remove(); }, 3200);
    } catch (e) { /* captions are cosmetic */ }
  }
  function stopSounds() { try { if (typeof Audio_ !== 'undefined' && Audio_.hum) Audio_.hum(0, 0, 'p16k_tank'); } catch (e) { /* none running */ } T.hum = 0; }
  const HUM_HZ = 146.8, TANK_AT = [5.0, 6.5];
  function humLevel() {
    if (!aboard()) return 0;
    if (G.mapId === DECK) return 0.12;
    const c = Engine.cam, d = Math.hypot(c.x - TANK_AT[0], c.y - TANK_AT[1]);
    return clamp(1 - d / 13, 0.12, 0.7);
  }

  // ---------------------------------------------------------------- per-frame (cheap): hum, Mags turning, closing
  function tick(dt) {
    if (!hasG() || !aboard()) { if (T.hum) stopSounds(); return; }
    if (typeof ROPE45 !== 'undefined' && ROPE45.aboard()) return;   // Grab the Line is played on this deck before Part Three
    if (!cfg.on) { leaveShip(); return; }
    if (!shipExists()) { leaveShip(); return; }
    const lvl = humLevel();
    if (audioOk()) { try { Audio_.hum(lvl, HUM_HZ, 'p16k_tank'); } catch (e) { /* none */ } T.hum = lvl; }
    if (G.mapId === BELOW) {
      if (cineWas !== cineOn()) { cineWas = cineOn(); refresh(); }   // the preset changed aboard: the fill lights follow it
      const c = Engine.cam, near = Math.hypot(c.x - TANK_AT[0], c.y - TANK_AT[1]) < 5;
      const t = typeof performance !== 'undefined' ? performance.now() : 0;
      if (near && t - T.capAt > 14000) { T.capAt = t; capLine(TX.below.hum); }
    }
    if (G.mapId === DECK && G.ents) {
      const e = G.ents.find((o) => o && o._p16k === 'crew_mags'); if (!e) return;
      const c = Engine.cam, d = Math.hypot(c.x - e.x, c.y - e.y), sees = magsSees(e);
      if (!sees && d < 3.4) {
        T.turnT += dt || 0;
        if (T.turnT > 4) { e.facing = Math.atan2(c.y - e.y, c.x - e.x); T.turnT = 0; }      // she feels the deck move and turns round
      } else T.turnT = 0;
      if (d > 8) { T.away += dt || 0; if (T.away > 6) { e.facing = 0; T.away = 0; } } else T.away = 0;
    }
  }

  // ---------------------------------------------------------------- wiring (wrap, never edit)
  function onLoad(id) {
    if (MAPS.indexOf(id) < 0) return;
    sanitize();
    furnish(G.maps[id]);
    const c = Engine.cam, m = G.map;
    if (m && (m.isBlocked(c.x | 0, c.y | 0) || !Number.isFinite(c.x) || !Number.isFinite(c.y))) {      // a hostile save can put the camera in a wall
      const sp = m.spawn; c.x = sp.x; c.y = sp.y; c.dir = sp.dir || 0;
      try { settleFeet(); } catch (e) { /* ok */ }
    }
    if (id === BELOW) T.capAt = -1e9;
  }
  function wireMaps() {
    if (typeof buildAllMaps === 'function') {
      const _b = buildAllMaps;
      buildAllMaps = function () {
        const maps = _b.apply(this, arguments);
        try { paintTextures(); if (!maps[DECK]) maps[DECK] = buildDeck(); if (!maps[BELOW]) maps[BELOW] = buildBelow(); } catch (e) { warnOnce('build', e); }
        return maps;
      };
    }
    if (typeof loadMap === 'function') {
      const _lm = loadMap;
      loadMap = function (id, pos) {
        try {
          sanitize();
          if (id === DECK && G.maps && G.maps[DECK]) G.maps[DECK].music = mooring() === 'deepwoods' ? 'coda' : 'grove';
          if (MAPS.indexOf(id) >= 0 && !(typeof ROPE45 !== 'undefined' && ROPE45.aboard()) && (!cfg.on || !shipExists())) {   // Grab the Line (js/rope45.js) is played on this deck before Part Three
          const L = landing(); id = L.map; pos = { x: L.x, y: L.y, dir: L.dir }; }   // switch off or a hostile save: you are on the ground
        } catch (e) { warnOnce('pre', e); }
        const r = _lm.call(this, id, pos);
        try { onLoad(id); if (MAPS.indexOf(id) < 0) stopSounds(); } catch (e) { warnOnce('loadMap', e); }
        return r;
      };
    }
    if (typeof restoreGame === 'function') {
      const _rg = restoreGame;
      restoreGame = function () {
        stopSounds();
        const r = _rg.apply(this, arguments);                 // a bad save throws here, before anything below
        try { sanitize(); T.turnT = 0; T.away = 0; refresh(); if (aboard()) onLoad(G.mapId); } catch (e) { warnOnce('restore', e); }
        return r;
      };
    }
    if (typeof startGame === 'function') {
      const _sg = startGame;
      startGame = function () { const r = _sg.apply(this, arguments); try { stopSounds(); T.turnT = 0; T.away = 0; refresh(); } catch (e) { warnOnce('start', e); } return r; };
    }
    if (typeof update === 'function') {
      const _up = update;
      update = function (dt) {
        const r = _up.apply(this, arguments);
        try { if (G.state === 'play' || G.state === undefined) tick(dt); } catch (e) { warnOnce('tick', e); }
        return r;
      };
    }
  }
  function wireUse() {
    if (typeof useDeco === 'function') {
      const _use = useDeco;
      useDeco = function (e) {
        try {
          if (e && e.kind === 'deco') {
            if (e.use === 'wg_ladder' && cfg.on && shipExists()) { boardMenu('wg', () => _use.call(null, e)); return; }
            if (e.use === 'kestrel' && cfg.on && hasG() && G.flags.tank_patched && G.mapId === 'deepwoods') { boardMenu('dw'); return; }
            if (e.use === 'p16k_exit') { leaveShip(); return; }                 // always works, switch on or off: you can always get off
            if (e.use === 'p16k_down') { goBelow(); return; }
            if (e.use === 'p16k_up') { goDeck(); return; }
            if (e.use === 'p16k_table') { tableMenu(); return; }
            if (e.use === 'p16k_bed') { rest(); return; }
            if (e.use === 'p16k_list' || e.use === 'p16k_locker') { openList(); return; }
            if (e.use === 'p16k_peg') { railMenu(e); return; }
          }
        } catch (err) { warnOnce('use', err); }
        return _use.apply(this, arguments);
      };
    }
    if (typeof talk === 'function') {
      const _talk = talk;
      talk = function (e) {
        try {
          if (e && e.id === 'p16k_mags' && !magsSees(e)) {
            const t = typeof performance !== 'undefined' ? performance.now() : 0;
            if (t - T.sayAt > 2500) { T.sayAt = t; say(TX.crew.leaveSightNo, 'warn', 7000); }
            return;
          }
        } catch (err) { warnOnce('talk', err); }
        return _talk.apply(this, arguments);
      };
    }
    if (typeof renderHouseChest === 'function') {
      const _rc = renderHouseChest;
      renderHouseChest = function () {
        const r = _rc.apply(this, arguments);
        try { if (aboard()) { const h = document.querySelector('#modal-panel h2'); if (h) h.textContent = TX.chest.replace(/ \(.*\)$/, ''); } } catch (e) { warnOnce('chest', e); }
        return r;
      };
    }
  }
  function wireTravel() {
    if (typeof travelMinutes === 'function') {
      const _tm = travelMinutes;
      travelMinutes = function () { const r = _tm.apply(this, arguments); try { if (cfg.on && aboard()) return travelMinutesFor(r); } catch (e) { warnOnce('minutes', e); } return r; };
    }
    if (typeof travelRisk === 'function') {
      const _tr = travelRisk;
      travelRisk = function () { const r = _tr.apply(this, arguments); try { if (cfg.on && aboard()) return r * riskFactor(); } catch (e) { warnOnce('risk', e); } return r; };
    }
    if (typeof travelHere === 'function') {
      const _th = travelHere;
      travelHere = function (regionId) {
        try {
          if (cfg.on && aboard() && typeof TRAVEL_REGIONS !== 'undefined' && TRAVEL_REGIONS[regionId] && TRAVEL_REGIONS[regionId].maps[mooring()]) {
            const L = landing(); return travelPlace(TRAVEL_REGIONS[regionId], L.map, L.x, L.y);
          }
        } catch (e) { warnOnce('here', e); }
        return _th.apply(this, arguments);
      };
    }
  }

  // ---------------------------------------------------------------- options
  function row(grid) {
    const mk = (tag, props, text) => { const e = document.createElement(tag); if (props) for (const k in props) e.setAttribute(k, props[k]); if (text != null) e.textContent = text; return e; };
    const lab = mk('span', { class: 'gfx-label' }, TX.opts.label + ' '); lab.appendChild(mk('small', { class: 'muted' }, TX.opts.hint));
    const b = mk('button', { class: 'dfbtn small', id: 'k16-opt', type: 'button', 'aria-pressed': String(cfg.on) }, cfg.on ? 'On' : 'Off');
    b.classList.toggle('sel', cfg.on);
    b.onclick = () => {
      cfg.on = !cfg.on; saveCfg(); b.textContent = cfg.on ? 'On' : 'Off'; b.setAttribute('aria-pressed', String(cfg.on)); b.classList.toggle('sel', cfg.on);
      try { if (!cfg.on) stopSounds(); refresh(); } catch (e) { /* ignore */ }
    };
    grid.appendChild(lab); grid.appendChild(b);
  }
  function wireOptions() {
    if (typeof renderAccessibilityMenu !== 'function') return;
    const _acc = renderAccessibilityMenu;
    renderAccessibilityMenu = function () {
      const r = _acc.apply(this, arguments);
      try { const grid = document.querySelector('#modal-panel .ctl-grid'); if (grid && !document.getElementById('k16-opt')) row(grid); } catch (e) { warnOnce('options', e); }
      return r;
    };
  }
  function injectStyle() {
    if (typeof document === 'undefined' || document.getElementById('kestrel16-style')) return;
    const st = document.createElement('style'); st.id = 'kestrel16-style';
    st.textContent = '.p16k-t{width:100%;border-collapse:collapse}.p16k-t td{padding:.5cqh .8cqw;vertical-align:top;border-bottom:1px solid var(--gold-dim,#6a5a30)}.p16k-t .muted{font-size:1.8cqw}.p16k-t td.n{white-space:nowrap;text-align:right;vertical-align:middle}';
    document.head.appendChild(st);
  }

  // ---------------------------------------------------------------- boot
  loadCfg();
  const wire = (name, fn) => { try { fn(); } catch (e) { console.warn('kestrel16: ' + name + ' wiring failed', e); } };
  try { if (typeof document !== 'undefined') { paintAll(); paintPennick(); injectStyle(); } } catch (e) { console.warn('kestrel16: art failed', e); }
  installNpc();
  wire('maps', wireMaps); wire('use', wireUse); wire('travel', wireTravel);
  if (typeof document !== 'undefined') wire('options', wireOptions);
  // arrival cards (js/screens.js): the deck is outdoor, so it fell back to the 'woods' painting (a burning boat in a forest).
  // Below-decks takes the timber-and-stair 'belfry' painting; the deck takes the plain stand-in card (no painting fits a
  // ship in the air) (Phase 16 polish).
  const CARDS = { [DECK]: 'plain', [BELOW]: 'belfry' };
  try { if (typeof SCREENS !== 'undefined' && SCREENS.FAMILY) Object.assign(SCREENS.FAMILY, CARDS); } catch (e) { /* no cards */ }
  try { const h = H15(); if (h && Array.isArray(h.HEARTH_MAPS) && h.HEARTH_MAPS.indexOf(BELOW) < 0) h.HEARTH_MAPS.push(BELOW); } catch (e) { /* hearth15 absent */ }

  return {
    CARDS, FILL_BELOW, DECK, BELOW, MAPS, B, UPG, LOCKER, CREW, FLAGS, TX, cfg, saveCfg, loadCfg, DECK_AT, BELOW_AT, RAIL_PEGS, OX, OY, T,
    get TEXTS() { return LIST.slice(); },
    fint, fset, sanitize, upHas, crewHas, seenHas, mooring, landing, costOf, blockers, canFit, fit, buyMaterial, travelMinutesFor, riskFactor, magsSees, magsAtCamp,
    recruitCheck, hire, giveLoaf, mendWeapon, railState, hangRail, takeRail, furnish, refresh, board, boardBlock, leaveShip, goBelow, goDeck, rest, hop, hopAllowed,
    tableMenu, openList, boardMenu, tick, onLoad, buildDeck, buildBelow, shipExists, aboard, humLevel, stopSounds, isDeckLocal,
  };
})();
if (typeof window !== 'undefined') window.KESTREL16 = KESTREL16;
