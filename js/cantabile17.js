// ============================================================
//  cantabile17 — Phase 17 "Beyond Book One", team CANTABILE: "A trip to Port Cantabile".   AN EXTRA, SET AFTER BOOK ONE.
//
//  Reached only from the Extras menu (js/extras17.js): EXTRAS17.register({ id: 'cantabile', start, ... }) below. It runs in the
//  extra's own session, so the Book One save is never touched; this module also never writes localStorage and never sets a flag
//  outside p17c_. It builds five maps, registered from this module the way js/flume16.js does (never maps.js / data.js), and
//  nothing in Book One leads to any of them.
//
//  WHEN: Memoryday, the seventh of Ashfall, 419 [PROPOSED: a day inside Book Two's first week, which the Kestrel spends on the
//  Harbour's bench. Book Two's own scenes (the Bitter Nancy, the Stair, the counting-house, the dive, the Mole-head) are not
//  staged and not contradicted: the visit is an errand ashore on a day that goes on around them. Ashfall is late autumn: the
//  winter look is called with no snow, no falling snow and a faint cold grade, and breath only.]
//  WHERE (Vol IV "Book Three: the Rust Coast", which supersedes Vol II: a CLIFF HARBOUR, not a rope-bridge town):
//    cantabile_harbour  one big relief map. The Long Mole runs east out of the Lantern Yard with the derrick, the Mole-bell and
//                       the mast-tower (the Kestrel hangs from it) at its head. The Salt Stair is six wet flights cut up the
//                       cliff behind the Yard, forty-one steps each (the Phase 2 height system: every flight is a real slope
//                       that climbs 1.8, six landings at 0.4 + 1.8 n, so the top is 11.2 above the quay), with a landing at the
//                       head of each flight and a lantern on a hook. At the top, a yard of wet flags and the counting-house
//                       (square stone, slate roof, iron shutters, a brass sun-disc over the door): CLOSED, a door like any other.
//    cantabile_office   the Harbour office (Kerrow, the board, the Articles)
//    cantabile_chandler the chandler on the third landing (diving-helm in the window that was new in his grandfather's time)
//    cantabile_widow    a room cut into the rock on the fourth landing (the widow with the bottle she has not opened in 3 years)
//    cantabile_cay      Driftwood Cay: the burying-ground, children in earth, a small bell on an iron hook at every grave
//  WHAT TO DO (a small errand chain, never required beyond the first rung up to the Kestrel; you may leave at any time):
//    1. PAY THE DUES. Six sovereigns, into the Harbour-Queen's own hand, AT THE SLACK. She asks the greeting, "What's she
//       singing?", and the answer is the key the reef is singing right now. THE REEF-PITCH PUZZLE: the reef sings six keys up
//       from a low E (E, F-sharp, G, A, B, C), one to the tide-hour, and drops back. The board says the slack is "the key before
//       the turning"; a pilot's rhyme (Captain Teel) and Auld Bessa give the order; the water tells you too (the boats hang
//       slack on their ropes at the slack, and swing together at the turning). Say the right key AT the slack.
//    2. THE GAUGE-VALVE (Pennick's list). The chandler sells to hulls with the Harbour's receipt.
//    3. THE BOTTLE. Marrin Tace, fourth landing, holds a vox-bottle she has not opened in three years and will not sell. She asks
//       you to carry it, unopened, to the Harbour-Queen and ask for the bell. The Mole-bell is the town's grammar of grief:
//       one stroke for each soul that goes into the water, then silence so the harbour can count. Or sell it to the Office's
//       receiving clerk at six sovereigns and a stamped receipt (the administrative horror; the choice is yours).
//    Small things: lift a salvage crate under the Sixteenth Article; hang a grave-bell on a bare hook on the Cay; read the
//    Articles; sit on the fifth landing; the bell for "someone nobody can name" (the Mole-bell rings once, unasked, at some
//    point on your walk, and the whole Yard stops and counts).
//  The Hush is never shown, a "quiet" is only ever the rule about bottles ("never on a ship; never take the stopper out").
//
//  BALANCE (the one table, B): purse 20 (Vane's money, topped up to at least that); dues 6; valve 5; a grave-bell 1; salvage
//  crate +8 (a fifth to the Harbour); the clerk's offer 6; rewards: dues 20 xp, valve 15, the bottle rung 45 xp + 6 sovereigns
//  (Mistress Tace insists) + a pilot's whistle, a bell hung 10, salvage 5. The reef clock: six keys of 24 s (144 s a cycle),
//  frozen while a dialogue or panel is open; the slack (B) lasts 24 s; the first slack comes about 72 s after arrival.
//  There is no combat, no hunger rule beyond the game's own, and no way to be stuck: every map has its doors, the mast-tower
//  is always climbable (not with the bottle: "never on a ship") and you can leave whether or not the errands are done.
//
//  STATE: G.flags under p17c_ only, small validated integers (FLAGS). Everything else is transient. The five maps build
//  deterministically so saved entity indexes line up (baseCount set once; nothing is inserted into an old list).
//  Every invented name, place and fact is marked [PROPOSED]; every player-visible string is in TX, registered through S().
//  ART: procedural stand-ins (canvas painting, cached once). Security: no markup is built from saves or flags.
// ============================================================
'use strict';

const CANTABILE17 = (function () {
  const FP = 'p17c_';
  const ID = 'cantabile';
  const MAPS = ['cantabile_harbour', 'cantabile_office', 'cantabile_chandler', 'cantabile_widow', 'cantabile_cay'];
  const HARBOUR = MAPS[0], OFFICE = MAPS[1], CHANDLER = MAPS[2], WIDOW = MAPS[3], CAY = MAPS[4];
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const inMine = (id) => MAPS.indexOf(id) >= 0;
  const mapOf = (id) => (typeof G !== 'undefined' && G.maps) ? G.maps[id] : null;
  const reduced = () => { try { return !!(GFX.reduceMotion || GFX.reducedMotion); } catch (e) { return false; } };

  // ---------------------------------------------------------------- balance, one table
  const B = {
    PURSE: 20,                                        // sovereigns: Vane's money, topped up to this on arrival
    DUES: 6, VALVE: 5, BELL: 1, CLERK: 6,
    SALVAGE: 10, FIFTH: 2,                            // the crate is worth 10; the Harbour takes a fifth (rounded up): you keep 8
    XP: { dues: 20, valve: 15, bottle: 45, bell: 10, salvage: 5 },
    TACE_GOLD: 6,
    KEY_SECS: 24, KEYS: 6, SLACK: 4, START_KEY: 1, START_T: 0,   // the reef clock; key index 4 (B) is the slack
    NOTE_HZ: [164.81, 185.0, 196.0, 220.0, 246.94, 261.63],       // E3 F#3 G3 A3 B3 C4: E natural minor, the winter key
    COUNT_SECS: 11,                                   // the harbour counts after the Mole-bell
    BELL_HEAR: 60,                                    // the stroke is heard everywhere on the harbour map and the Cay
    MOURN_AFTER: [26, 42],                            // seconds of walking before the unasked stroke, once you leave the mast
    DAY: 31, TOD: 0.34,                               // G.day 31 is Memoryday the seventh of Ashfall (calendar11); a clear morning
  };

  // ---------------------------------------------------------------- state: flags (validated) and the transient session
  const flags = () => (typeof G !== 'undefined' && G.flags && typeof G.flags === 'object') ? G.flags : {};
  const FLAGS = { act: [0, 1], q: [0, 2], valve: [0, 1], btl: [0, 3], bell: [0, 1], salv: [0, 1], seen: [0, 31], heard: [0, 1],
    reads: [0, 9], fin: [0, 1], shan: [0, 1], bes: [0, 1], met: [0, 255], rec: [0, 1], hung: [0, 7] };
  // q: 0 none, 1 told what the slack is, 2 dues paid.  btl: 0 none, 1 carrying Marrin Tace's bottle, 2 rung for, 3 sold.
  function fint(k) { const v = flags()[FP + k], r = FLAGS[k]; return (typeof v === 'number' && Number.isInteger(v) && v >= r[0] && v <= r[1]) ? v : 0; }
  function setf(k, v) { const r = FLAGS[k]; flags()[FP + k] = clamp(v | 0, r[0], r[1]); }
  function validate() {
    const f = flags();
    for (const k of Object.keys(f)) {
      if (k.indexOf(FP) !== 0) continue;
      const name = k.slice(FP.length);
      if (!has(FLAGS, name)) { delete f[k]; continue; }
      const v = f[k], r = FLAGS[name];
      if (!(typeof v === 'number' && Number.isInteger(v) && v >= r[0] && v <= r[1])) delete f[k];
    }
  }
  // transient, never saved: the reef clock, the count, the unasked stroke, the ambience
  const T = {
    key: B.START_KEY, t: B.START_T, clock: 0,          // the reef: the key index and seconds into it
    count: 0,                                          // seconds of the harbour's count left (0 = none)
    mourn: -1,                                         // seconds until the unasked stroke (-1: not started)
    walked: 0, started: false, capT: {}, said: {},
    ending: false, swing: 0,
  };

  // ---------------------------------------------------------------- the text (every player-visible string; see TEXT.md)
  const LIST = [];
  const S = (t) => { LIST.push(t); return t; };
  const NOTE = ['E', 'F-sharp', 'G', 'A', 'B', 'C'];
  const TX = {
    ex: {
      id: S('A trip to Port Cantabile'),
      blurb: S('An errand ashore from the Drift-Kestrel: the Long Mole, the Salt Stair\'s six wet landings, a harbour that sings the hour, and a bottle nobody has opened.'),
      kicker: S('An extra: after Book One'),
      date: S('Memoryday, the seventh of Ashfall, 419 SR'),
      card: S('The Drift-Kestrel lies on the Harbour\'s bench at the head of the Long Mole, murmuring on her mooring, and every hand she has is wanted aboard. Pennick has a list. Vane has a purse. You are the one who can be spared.<br><br>Pay the Kestrel\'s dues to the Harbour. Fetch the gauge-valve from the chandler on the third landing. Be back at the mast before dark.<br><br>Mind the Stair. Every step is wet.'),
      go: S('Go ashore'),
      journal: S('Port Cantabile, the seventh of Ashfall. Pennick sent me ashore from the Kestrel with a list and twenty sovereigns of Vane\'s money: pay the mooring dues to the Harbour, fetch a gauge-valve from the chandler on the third landing, and be back at the mast-tower before dark.'),
    },
    harbour: {
      arrive: S('Port Cantabile. Salt, tar, rum, fish, lime and rot, and sun off the water moving on every wall. Nothing here is still.'),
      journal: S('The Kestrel is moored at the mast-tower at the head of the Long Mole. The Lantern Yard is the lower town. The Salt Stair climbs the cliff in six wet flights, with a shop on the landings, to the counting-house at the top.'),
      mast: S('The mast-tower: sixty feet of iron rungs, and the Drift-Kestrel on her mooring at the head of it, murmuring.'),
      rungs: S('The foot of the mast-tower. Iron rungs, wet, going up into the Kestrel\'s shadow.'),
      derrick: S('The derrick on the Mole-head. The Articles of the Free Captains are kept from here, and everyone on the Mole knows how.'),
      bell: S('The Mole-bell, in its iron frame, with a rope hanging to the stones. It is rung once for each soul that goes into the water. Then nobody speaks, so the harbour can count.'),
      bellRope: S('You do not touch the rope. It is the Harbour\'s, and it is rung for the dead, and nobody has asked you to ring it.'),
      boat: S('A moored boat. At her shroud-head hangs a bar of small bronze tubes, and the wind plays it.'),
      coil: S('A coil of tarred rope, laid down the Harbour\'s way, left hand over right.'),
      net: S('A net drying on poles. It smells of the sea, and of what the sea would rather keep.'),
      wash: S('Washing on a line between two posts. Everything here dries in the wind, and is salt again by noon.'),
      gull: S('A gull on a bollard, giving you the look of someone who is owed money.'),
      post: S('A harbour lamp on an iron post. At dusk they light the Stair one landing at a time.'),
      boots: S('One of Hesper\'s four houses. A row of small boots by the door, and the door is shut for supper.'),
      shut: S('A house of the Lantern Yard, lime-washed, with salt streaked down its face. Nobody is at the window. Somebody is behind it.'),
      sign: S('THE HARBOUR OFFICE. Dues, bench and bell. Under it, in chalk: THE ARTICLES ARE READ AT NOON.'),
      cliff: S('Cliff. Wet, grey, furred with weed at the foot. The Stair is cut into it.'),
      rail: S('A rail of iron stanchions in lead pockets, and two strung cables. Beyond it the drop starts at thirty feet on the first flight and ends at a hundred and ninety on the sixth.'),
      step: S('Forty-one steps in this flight, and every step is wet. A gutter runs down the middle all day with the overflow of the cistern at the top.'),
      lamp: S('A lantern on a hook, small and gold, with a washing line beside it.'),
      listen: S('Listen to the reef'),
      stairFoot: S('The foot of the Salt Stair. Six flights up the cliff, and numbered landings, and at night a zigzag of small gold lamps.'),
      crate: S('A crate wallowing off the Yard steps, roped to nothing. Article the Sixteenth: what lies below the tide-mark belongs to whoever brings it up. The Harbour takes a fifth.'),
      crateGone: S('The Yard steps, and a ring in the water where the crate was.'),
      crateLift: S('You hook the crate in with the Yard\'s boat-hook and haul it up the steps. A fifth goes to the Harbour\'s box, honestly, and you keep the rest.'),
      crateDone: S('Whatever was in the crate is in your purse now, less the Harbour\'s fifth.'),
      mole: S('The Long Mole. Granite blocks, green at the water, and an iron ring every few paces to make fast to. The water goes by on both sides and the whole arm hums faintly with it.'),
      view: S('From here the whole harbour lies open: the Mole, the boats at their moorings, the reef green under forty feet of water, and out past the harbour mouth, low and grey, the Cay.'),
      bench: S('A bench cut out of the landing wall, worn to a dip by a hundred years of people getting their breath. You sit a moment. The Stair goes on beneath you, wet.'),
      cistern: S('The cistern at the top of the Stair: green slate, a spout, and the overflow running away down the steps all day.'),
      spar: S('A gap in the rail, lashed across with a spar. Somebody has hung a lantern on it, and the lamp is lit.'),
      noRest: S('Nobody sleeps ashore at Port Cantabile. If you are tired, the Kestrel has a bunk, and the Coast has rules about the rest.'),
      dusk: S('The light is going. Somewhere on the Stair a lamplighter starts at the bottom. Mags will want you back at the mast before the last lamp.'),
      mourn: S('The Mole-bell rings once. The Yard stops talking. A woman on a doorstep puts down her net, lifts her face to the sea and counts, with her lips. Nobody says whose it was. Then the harbour is itself again, loud with its own small noises, and nobody looks at anybody for a while.'),
    },
    landing: {
      n1: S('FIRST LANDING. Rope and tar. The shutters are up and a card in the window says BACK AT THE TURN.'),
      n2: S('SECOND LANDING. A shuttered shop with a card in the window: BOTTLES. Nobody on the landing looks at it.'),
      n3: S('THIRD LANDING. A chandler\'s, with a diving-helm in the window that was new in his grandfather\'s time.'),
      n4: S('FOURTH LANDING. A narrow door in the rock, with a lamp on a hook and three years of salt on the step, swept this morning.'),
      n5: S('FIFTH LANDING. A net-loft and a bench, and the best view on the Stair.'),
      n6: S('SIXTH LANDING, the top of the Stair. A yard of wet flags, with the wind going over it.'),
      door1: S('The rope-and-tar shop is shut, and the door has been shut since before you came.'),
      door2: S('The shutters of the shop on the second landing are down, and a chalk mark on the lintel has been rubbed at and not quite out.'),
      door3: S('The chandler\'s'),
      door4: S('Mistress Tace\'s door'),
      door5: S('The net-loft door, hung with floats. It is on the latch, and nobody is in.'),
    },
    top: {
      shut: S('The counting-house door is shut and the iron shutters are down. Over the lintel a sun-disc of hammered brass, and on the disc the Church\'s flame. You knock. Nobody answers. It is a door like any other, and it is closed.'),
      label: S('The counting-house: square stone, a slate roof, iron shutters. The oldest building in Port Cantabile, built by the Synod\'s tax-farmers to count what the harbour owed, and given to the Church.'),
      sun: S('A sun-disc of hammered brass over the door. On the disc, the Church\'s flame.'),
      east: S('The cliff-top, and the wind going over it. Beyond the wall, grey grass and a long drop to the sea.'),
    },
    reef: {
      note: [
        S('She is singing E, low and a little flat, like a held breath.'),
        S('She is singing F-sharp, and the swell lifts under it.'),
        S('She is singing G, bright, with gold on the water.'),
        S('She is singing A, grey and level.'),
        S('She is singing B, and the harbour goes slack: the boats hang on their ropes and the water stops pulling.'),
        S('She is singing C, and the water turns: every boat swings on her rope at once.'),
      ],
      change: [
        S('The reef changes key: E.'),
        S('The reef changes key: F-sharp.'),
        S('The reef changes key: G.'),
        S('The reef changes key: A.'),
        S('The reef changes key: B.'),
        S('The reef changes key: C.'),
      ],
      cap: S('The reef sings under the water'),
      capBell: S('The Mole-bell, once'),
      capChime: S('Bronze rigging-chimes'),
      capGrave: S('A grave-bell, in the wind'),
    },
    office: {
      arrive: S('The Harbour office. A pine box under the desk, a rack of gaffs, and a board on the wall with a great deal of chalk on it.'),
      journal: S('The Harbour office, at the foot of the Long Mole. Kerrow keeps the book, since Teague went into the Nancy\'s hold. The dues are paid to the Harbour-Queen herself, on the Mole-head, at the slack: and the slack is the key before the turning. The board on the wall says so.'),
      boardTitle: S('The Harbour\'s board'),
      board: S('THE REEF\'S KEYS, WINTER, SINCE THE FRACTURE.<br>The reef changes key with the tide. She sings six keys up from the low one, E, F-sharp, G, A, B, C, one to the tide-hour, and drops back to E at the turn. The Harbour keeps its business by the key.<br><br>MOORING DUES: six sovereigns a hull, a day, paid into the Harbour-Queen\'s own hand AT THE SLACK. The slack is the key before the turning. NOT THROUGH THE OFFICE. NOT BEFORE. NOT AFTER.<br><br>By order of the Harbour.'),
      boardLabel: S('A board on the wall, chalked over many times. THE REEF\'S KEYS, and MOORING DUES.'),
      articlesTitle: S('The Articles, as read at noon'),
      articles: S('<i>Article the Ninth.</i> Any vessel making the harbour under no hand shall be boarded by the Harbour\'s people and no other, and what is found aboard her belongs to the Harbour.<br><br><i>Article the Twelfth.</i> Nothing is to be lifted off a vessel lying on the Harbour\'s bench. The Harbour does not forbid theft; the Harbour forbids theft from the Harbour\'s own pocket, which is a different crime and carries the drop.<br><br><i>Article the Sixteenth.</i> What lies below the tide-mark belongs to whoever brings it up. The Harbour takes a fifth. The sea takes what it likes, and no court on this coast will hear a complaint against it.<br><br><i>Article the Twenty-first</i> [PROPOSED]. No bottle may be opened within the harbour.'),
      articlesLabel: S('The Articles of the Free Captains, painted white on black board, in numbered lines. They are read aloud at noon, in a flat voice, and enforced from the derrick.'),
      box: S('A pine box under the desk, two feet by one, with a lock on it. Kerrow says the key stays with the Harbour-Queen, and that it has been used four times in nineteen years.'),
      gaffs: S('A rack of gaffs and long hooks and lanterns, hung ready by size. The Harbour boards a thing that comes in under no hand, and it does not do it with its bare hands.'),
      out: S('Out to the Lantern Yard'),
      vox: S('A high shelf of vox-bottles, wax-sealed, each with a salvage tag and a chalk number. Found in the harbour, held for the Harbour, and never opened.'),   // [PROPOSED] POLISH17
    },
    chandler: {
      arrive: S('A chandler\'s, cut back into the rock. Coils of rope hang from the ceiling, lamp-oil and tar are in the air, and in the window stands a diving-helm that was new in his grandfather\'s time.'),
      journal: S('The chandler on the third landing: rope, tar, oil and brass. Sloe sells to hulls with the Harbour\'s receipt.'),
      helm: S('A diving-helm of beaten brass, dented, with a window the size of a hand. New in his grandfather\'s time. Fortis brass, he says. It is not.'),
      shelf: S('Shelves of lamp-oil, tar, wicks, marlinspike and brass fittings in drawers, every drawer labelled by hand, and every label crossed out and written over.'),
      out: S('Out to the third landing'),
    },
    widow: {
      arrive: S('A room cut into the rock. One window onto the harbour, a table laid for one, a bed made tight as a sail. It is very clean, and the floor is salt again already.'),
      journal: S('Mistress Marrin Tace lives on the fourth landing. A vox-bottle sits on her shelf that she has not opened in three years and will not sell.'),
      shelf: S('A shelf with one thing on it: a blue glass bottle with a wax seal, a chalk mark on the wax, and a clean place round it where nothing has been allowed to gather dust. J. TACE, and a four.'),
      table: S('A table laid for one, and a second chair that has been pulled out and pushed in again so often it has worn a mark.'),
      hearth: S('A small hearth, banked. The kettle is on, and the tea may or may not be tea.'),
      window: S('The window looks out over the Lantern Yard roofs and the harbour. From here you can hear the Mole-bell between the gulls.'),
      out: S('Out to the fourth landing'),
    },
    cay: {
      arrive: S('Driftwood Cay. A long low island of grey rock and grey scrub, and on its spine the burying-ground, where the Coast puts its children in earth. The wind comes across it, and every grave rings a little, each in its own voice.'),
      journal: S('Driftwood Cay, out past the harbour mouth. The Coast has no ground to spare, so its children are buried here in earth, and every grave has a small bell on an iron hook, so that the wind rings for them. Some hooks are bare.'),
      grave: S('A grave in the earth, a mound the length of a child, with a small bell on an iron hook beside it. The wind has found it.'),
      bare: S('An iron hook in the earth beside a small mound, with nothing hung on it. A bell costs a copper to Hesper and a sovereign to you.'),
      hang: S('You hang the bell on the hook. It takes the wind at once, a little crooked, and goes on ringing. You do not say anything. There is nobody on the Cay who would expect it.'),
      hangNo: S('You have no bell to hang. The chandler on the third landing sells them.'),
      hangDone: S('A small bell on an iron hook. The wind has found it already.'),
      hangJournal: S('I hung a small bell on a bare hook on the Cay, for a child nobody had claimed. The wind rang it before I had stepped back.'),
      house: S('Hesper\'s orphan-house: low, square, a kitchen window with the light on and a row of boots by the door. A line of washing, with a very small shirt.'),
      rock: S('The high rock above the orphan-house, where the Cay keeps its dead. The wind is steady up here, and it is never quiet.'),
      jetty: S('The jetty. Quain\'s boat lies at the end of it, and Quain beside her with his hat over his eyes.'),
      sea: S('The sea, going on, in the winter key. You can feel it in your teeth.'),
      scrub: S('Grey scrub, bent all one way.'),
      harbour: S('Away across the water the harbour, small and busy and gold, with the Stair going up it like a thread of lamps.'),
      back: S('The jetty back to the Mole'),
    },
    // ---- people
    teague: {
      name: S('Kerrow, Harbour office'),
      polite: S('Harbour office. Dues, bench and bell, in that order, and the bell is not mine to ring.'),
      normal: S('Harbour office. If it is dues, it is not me. If it is not dues, it is still not me.'),
      blunt: S('Be quick. The tide will not wait, and neither will the Harbour-Queen.'),
      intro: S('Kestrel? Aye, on the bench at the mast-tower since the morning tide. Six sovereigns a hull, a day, same as anyone. Not to me. The Harbour-Queen takes dues in her own hand, on the Mole-head, at the slack, and I have asked her to take them through me eleven times.'),
      paid: S('Square with the Harbour, and the book says so. Mind the Stair going up. It is wet on every flight, and the Harbour has had enough of it.'),
      qSlack: S('What is the slack?'),
      aSlack: S('The water stands still between the flood and the ebb. You will know it by the reef: she changes key hour by hour, and the slack is the key before the turning. It is on the board on my wall, if you read it slowly. Auld Bessa on the Mole steps will teach you to hear it in a breath, and she is right oftener than the tide-tables.'),
      qWhere: S('Where do I find the Harbour-Queen?'),
      aWhere: S('On the Mole-head, by the bell. Nineteen years of mornings, and most afternoons. Do not stand under the derrick. Everyone does it once.'),
      qArticles: S('Read me the Articles.'),
      aArticles: S('Kerrow reads them in the voice you would use for a tide-table. The Ninth, the Twelfth, the Sixteenth and the Twenty-first. When he is done he says, in exactly the same voice, "That is all of them that anyone is likely to ask about."'),
      qBell: S('What does the bell mean?'),
      aBell: S('One stroke for every soul that goes into the water. Then nobody speaks, so the harbour can count. That is the whole grammar, there is no other. If you hear it, somebody has had the worst day of their year, and you do not ask whose.'),
      qShort: S('I am short of the dues.'),
      aShort: S('Article the Sixteenth. There is a crate off the Yard steps nobody has lifted in two days, and the boat-hook is on the post. The Harbour takes a fifth, and it will take its fifth honestly.'),
      qPaid: S('I paid the dues.'),
      qBye: S('That is all.'),
    },
    oona: {
      name: S('Oona Salt, the Harbour-Queen'),
      polite: S('Harbour-Queen is not a title anyone gives you, and not one anyone can take back. What is it you want?'),
      normal: S('What\'s she singing?'),
      blunt: S('I have ears, a harbour and a headache, and I can only put down one of them.'),
      ask: S('What\'s she singing?'),
      again: S('Dues, is it? What\'s she singing?'),
      askReef: S('Ask the reef.'),
      none: S('Not today.'),
      reefReply: S('"Aye. That is how it is answered here." She says it kindly, and she does not take her eyes off the water. "The reef will tell you, if you stand still. Come back when she has."'),
      goBack: S('"Then go and ask her properly." She nods at the Mole steps. "Auld Bessa will teach you in a breath."'),
      wrong: S('"No." She does not raise her voice. "Listen again. Do not think about the pitch. Think about the hour."'),
      rightNotSlack: S('"Right. And that is not the slack. I take dues at the slack, in my own hand, and not before. Come back when she has changed. You will hear the boats go slack on their ropes."'),
      broke: S('"You have the note and not the coin." She looks at your purse the way she looks at weather. "Article the Sixteenth. There is a crate off the Yard steps. I will be here."'),
      pay: S('She counts the six sovereigns without looking at them. "Drift-Kestrel," she says, flat, a woman reading a tide-table, "one hull, one berth at the mast-tower, dues six sovereigns, received at the slack in the Harbour-Queen\'s own hand." She gives you a receipt with a chalk stamp on it. "The chandler will want that. He does not sell brass to a hull on the Harbour\'s bad list, and neither would I."'),
      payGold: S('You pay the Harbour six sovereigns, and the Harbour writes it down.'),
      after: S('"Square, you are." She does not look round. "Anything else is a question for the water."'),
      qBell: S('Ask about the Mole-bell.'),
      aBell: S('"Once for every soul that goes in. Then silence, so the harbour can count." She looks at the rope. "Nobody rings it for anything else. It is not for me to say what else it is for. It is for the dead, and the dead have a way of not minding."'),
      qBottle: S('Mistress Tace, on the fourth landing, sends a bottle. She has not opened it in three years. She asks if the bell can be rung.'),
      aBottle1: S('There is a silence on the Mole-head, and in it the sea goes on breathing against the stones.<br><br>"The Articles ring the bell for the dead who go into the water. A bottle is not the dead. A bottle is not anything. That is what I have told forty widows, kindly, and I have meant it."'),
      aBottle2: S('"My brother Merret was a pilot. A man held his bottle back eleven days, because his sister would pay more." She holds out her hand, flat. "Give it here. Do not unstopper it. Do not look at the chalk."'),
      qGive: S('Give her the bottle.'),
      qKeep: S('Keep it a little longer.'),
      aKeep: S('"As you like. It is hers to ask, and mine to ring, and neither of us is in a hurry." Her hand does not move for a while.'),
      ringTitle: S('The Mole-bell'),
      ring: S('Oona Salt takes the bottle in both hands, like something that might spill. She does not open it. She does not look at it. She walks to the edge of the Mole-head, and waits there until the tide is right, and then she lets it down into the water on a length of cord, and lets go of the cord.<br><br>She puts her hand on the bell-rope, and rings it once.<br><br>Then nobody speaks. The gulls, the boats, the chimes: the whole harbour holds still, and counts.'),
      ringGo: S('Count with the harbour.'),
      ringEnd: S('Oona lets go of the rope. "That is the count," she says, in the voice she uses for tide-tables. The voice does not shake. Her hand does, and she puts it flat on her coat, where nobody can see.'),
      ringJournal: S('Marrin Tace\'s bottle went into the water off the Mole-head, unopened, and Oona Salt rang the Mole-bell for it. The harbour counted. Nobody has ever asked a bell for a bottle before, she said, and she did not say whether anyone will again.'),
      done: S('"The Harbour counted. That is all it can do. It is more than most places do."'),
      sold: S('"I hear a bottle went up the Yard in a grey man\'s ledger," she says, to the water. "I hear nobody asked the bell." She says nothing else, and nor does the Mole.'),
    },
    bessa: {
      name: S('Auld Bessa, the last Reef-Reader'),
      polite: S('Eyes shut, head on one side. That is how it is done. What\'s she singing?'),
      normal: S('Sit, if you can sit quietly. The reef does not like a talker.'),
      blunt: S('I am eighty-four. If you want something, it had better be short.'),
      intro: S('"What\'s she singing?" She does not open her eyes. The old woman sits on a bollard at the Mole steps with her head on one side, as if the sea were a long way off and talking low. She is the last Reef-Reader on the Rust Coast, and the harbour goes round her like water round a post.'),
      back: S('"Ah. You again. What\'s she singing?"'),
      qAsk: S('Ask the reef.'),
      aAsk: S('"That is it exactly. Ask, and wait. She will tell you if you are not in a hurry." The corner of her mouth moves. "Nobody is ever not in a hurry. That is why the Harbour keeps a clock made of fish."'),
      qTeach: S('Teach me to listen.'),
      aTeach: S('"The reef is a bar of keys, six of them, and she climbs one to each tide-hour. In the winter key, mind. She has been in the winter key since the Fracture. Seven years of winter." Her head tilts. "Start low: E. Then F-sharp. G. A. B. C. Then she drops back to E, and starts again. Do not listen to the pitch. Listen to what the boats do."'),
      qNow: S('What is she singing now?'),
      qSlack: S('What happens at the slack?'),
      aSlack: S('"The water stands still between the flood and the ebb, and the boats hang on their ropes like washing. Everything in Cantabile that was moving stops, for about the length of a breath. That is when the Harbour-Queen takes the dues." She smiles at nothing. "She is the only person on the coast who is never late for it."'),
      qWho: S('Who are you?'),
      aWho: S('"Bessa. I read the reef for the pilots, when I had pilots. Now I sit on a bollard and the pilots read it for themselves, badly." She turns her face toward you for the first time, and her eyes are shut, and she looks at you anyway. "You sing, I think. Do not do it near the water. The reef listens harder than it used to."'),
    },
    teel: {
      name: S('Hollis Teel, Free Captain'),
      polite: S('Hollis Teel, the Long Odds. Salvage and nothing else, whatever you have heard. What\'s she singing?'),
      normal: S('If you are selling, I am buying at a price you will not like. If you are buying, I have nothing.'),
      blunt: S('I am sitting on the best bollard in the Yard and I am not moving.'),
      intro: S('Hollis Teel, Free Captain of the Long Odds, salvage and nothing else, whatever you have heard. He sits on a bollard with his boots on a coil of rope and a stone jar between them, and sings a little under his breath, and stops when he sees you listening.'),
      qAsk: S('Ask the reef.'),
      aAsk: S('He laughs, one short bark, and the jar rocks. "Good. A stranger who knows what to say. Most say "the usual"."'),
      qRhyme: S('What was that you were singing?'),
      aRhyme: S('"A pilot\'s rhyme, the way they teach it to children on the Mole. A tide-table you can sing with a mouthful of rum."<br><br><i>E for the waking, F-sharp the flood,<br>G is the gold of the morning mud;<br>A is the grey, and B is the slack,<br>C is the turning, and she is coming back.</i>'),
      qSixteenth: S('Tell me about the Sixteenth.'),
      aSixteenth: S('"What lies below the tide-mark belongs to whoever brings it up, and the Harbour takes a fifth. That is the whole of my religion." He lifts the jar. "The sea takes what it likes, and no court on this coast will hear a complaint against it. Remember that, if you are ever tempted to complain to the sea."'),
      qBye: S('Good luck with the salvage.'),
    },
    sloe: {
      name: S('Fenwick Sloe, chandler'),
      polite: S('Rope, tar, lamp-oil, brass. The brass is from Fortis. Do not look at me like that, they all say it.'),
      normal: S('Gauge-valves, bells, oil. Ask. If I have it, you will not like the price.'),
      blunt: S('I do not haggle. Haggling is a form of theft and the Harbour has a view.'),
      noReceipt: S('A gauge-valve for a lift-tank? Aye, I have one, in a drawer I keep for the right sort of hull. I do not sell brass to ships on the Harbour\'s bad list, not since the Twelfth got interesting. Bring me the Harbour\'s receipt, and the drawer opens.'),
      bring: S('I will bring it.'),
      receipt: S('There is the Harbour\'s chalk on it, and the Queen\'s hand. Five sovereigns. It is the real brass.' + ' He leans in. "Mostly."'),
      pay: S('Pay five sovereigns.'),
      broke: S('Five, I said. You are short, and I am a man who notices.'),
      bought: S('He puts the valve in your hand in a twist of oiled cloth. "Your engineer will say it is the wrong thread. It is the right thread. They say that about every valve I have ever sold, and I have sold the Coast three hundred."'),
      after: S('Anything else? Bells for the hooks, a copper to anyone, a sovereign to anyone off the coast. The Cay has more bare hooks than it has bells.'),
      thanks: [S('Done.'), S('The Harbour thanks you.'), S('Mind the Stair.')],
      broke2: S('Not for what is in your purse.'),
      hello: S('Rope, oil, a bell for a hook. Look in the drawers if you like. Everything has a price and most things have two.'),
    },
    tace: {
      name: S('Marrin Tace, widow'),
      polite: S('Mind the step. I sweep it every morning, and every morning it is salt again.'),
      normal: S('Come in out of the stair. You will want to sit down; everyone does after the fourth flight.'),
      blunt: S('I do not sell it. That is the first thing everyone asks.'),
      intro: S('You are off the airship. I saw her on the mast from the landing, and so did the whole Stair. There is tea, and I can say it is tea.<br><br>You will have been told about bottles. Everyone is told about bottles, in the first hour. That one. <i>Jory\'s.</i> Jory Tace, pilot, lost off the Cay passage three years ago and not found. I bought it from a man on the second landing, the spring after. Four sovereigns. J. TACE, in chalk on the wax, and a four. I have never taken the stopper out.'),
      qWhy: S('Why not?'),
      aWhy: S('"If I open it and it is him, he will ask if it is the tide. They always ask. And he will be calm, and I will have a husband in a bottle in my kitchen, and a kitchen. If I open it and it is the other thing, I lose the kitchen. If I do not open it, he is both and neither, and I can sweep the step."'),
      qOffice: S('Has anyone offered to buy it?'),
      aOffice: S('"A man in a grey coat comes up from the Yard once a month, very civil. Six sovereigns, receipt stamped, and the bottle reconciled. I said it was not for sale, and he wrote that down." She turns her cup a quarter-turn. "I think he writes everything down."'),
      qWant: S('What do you want done with it?'),
      aWant: S('"I would have him go to the water with a bell. The way he should have, off the Mole at the turn, with the Harbour counting. But the Articles say the bell is for the dead who go in, and a bottle is not the dead, and the Harbour-Queen has told me so very kindly forty times. My knees will not do the Stair down. Would you carry it to her, and ask? Do not open it. Do not take it aboard a ship. Not even to look."'),
      qCarry: S('I will carry it.'),
      qNot: S('Not today.'),
      aCarry: S('She takes the bottle off the shelf in both hands and sets it in yours, like a full cup, and does not let go for a second after you have it. "Mind the wet. Every flight."'),
      carryJournal: S('Marrin Tace gave me her husband\'s vox-bottle, unopened, and asked me to carry it down to the Harbour-Queen and ask for the Mole-bell. Not aboard a ship. Not to be opened.'),
      aNot: S('"Then not today. The bottle is not going anywhere. That is rather the trouble with it."'),
      carrying: S('"You have him. Take your time on the Stair. Every flight is wet."'),
      rung: S('"I heard it. From the fourth landing you hear the Mole-bell between the gulls. One stroke. And then the whole harbour counted, and I counted with it. It is the only time in three years I have counted with anyone." She goes to the shelf and puts her hand on the clean place, and takes it away again. "Take this. Jory\'s pilot\'s whistle. It is tin. He whistled the keys when he could not hear them. It is no use to me and I cannot sweep round it. And these." Six sovereigns. "The six the grey man never got."'),
      rungDone: S('"I sweep the step, and I count. It is all right. It is not nothing, but it is all right."'),
      sold: S('She looks at the clean place on the shelf for a long time. "Then he has gone where they all go. I will not ask what you were paid." She is not angry. That is what is the matter. "Thank you for telling me straight."'),
      soldDone: S('"I sweep the step. There is nothing on the shelf, and I dust it."'),
      reward: S('You receive six sovereigns and a tin pilot\'s whistle.'),
      whistle: S('Jory\'s Pilot\'s Whistle'),
      whistleDesc: S('A tin whistle on a bit of cord, worn bright at the mouth. It plays the six keys of the reef, and only those.'),
      whistleUse: S('You blow the whistle softly. It plays the key the reef is in, and nothing else, and the boats do not mind.'),
    },
    clerk: {
      name: S('Mr. Dunmore, Receiving Clerk'),
      polite: S('Bottles are received, graded and reconciled. Receipts are stamped. The Office is grateful for your cooperation.'),
      normal: S('Six sovereigns the unit. I am told it is more than the trade will bear.'),
      blunt: S('There is a queue. It is, at present, you.'),
      none: S('Mr. Dunmore has a trestle desk, a ledger, a stamp, and a brass-bound box that clinks. His coat is grey. He is pleasant in the way a closed door is pleasant. "Units are received here," he says. "Six sovereigns, stamped. If you have a unit, it will be reconciled."'),
      have: S('Mr. Dunmore does not look at the bottle in your pack. He looks, kindly, at a place near it. "A unit is in your possession. Chalk on the wax: J. TACE, four. It would be reconciled today. Six sovereigns, stamped."'),
      qSell: S('Sell it.'),
      qNo: S('No.'),
      sold: S('"Received. Thank you." He writes. "A receipt is stamped. The Office is grateful for your cooperation." The bottle goes into the box with a small sound, one of many.'),
      soldJournal: S('I sold Marrin Tace\'s husband\'s bottle to the Office\'s receiving clerk on the Yard for six sovereigns and a stamped receipt. It went into a brass-bound box with a clink. I did not ask what reconciled meant.'),
      no: S('"The offer does not expire," says Mr. Dunmore. "It is simply not renewed." He writes something down.'),
      after: S('"The unit has been received. There is nothing further."'),
    },
    quain: {
      name: S('Marlow Quain, pilot'),
      polite: S('Cay run, a copper there and back. I go at the slack and I come back at the slack.'),
      normal: S('If it is the Cay you want, sit in the stern. If it is not the Cay, I am asleep.'),
      blunt: S('The boat goes when I say. Not before.'),
      text: S('Marlow Quain sits in his boat at the Mole steps with his hat over his eyes. "The Cay?" he says, without moving the hat. "A copper there and back. Do not sing in the boat. The reef listens harder past the mouth."'),
      qGo: S('Take me to the Cay.'),
      qNot: S('Not now.'),
      go: S('The harbour mouth goes by on the left, and the reef is green under the keel, and for the whole crossing Quain whistles four notes over and over and does not seem to notice. The Cay comes up out of the sea like a thing that has been waiting.'),
      back: S('Back to the Mole?'),
      qBack: S('Back to the Mole.'),
      qStay: S('A little longer.'),
      goBack: S('Quain rows back without a word, and the harbour comes up gold and loud out of the afternoon.'),
      onCay: S('Marlow Quain tips his hat back. "Back to the Mole, when you are done. I am not going anywhere. Nobody goes anywhere from the Cay but back."'),
    },
    hesper: {
      name: S('Hesper, of the four houses'),
      polite: S('You have the look of someone off the airship. They have all got it, the ones with ears for an engine.'),
      normal: S('Four houses, and a Cay, and nine children at supper tonight, and I have lost count, which is not a thing I say lightly.'),
      blunt: S('If you want something, say it. If you want to stand there, stand in the sun, it is free.'),
      intro: S('Hesper runs four houses on the Lantern Yard and takes in wreck-orphans on Driftwood Cay. She is a big slow woman with a soft face and a voice like a foghorn, and she has buried, she says, more children than most women on the Coast have borne. She has the kindness of a person who has stopped expecting anything back for it.'),
      qCay: S('Tell me about the Cay.'),
      aCay: S('"Older than the Coast\'s customs. The Cay\'s people were farmers once, and we put our children in earth there, because the town is cut into rock and every foot of flat ground is a house or a yard or a cistern. Every grave has a bell on a hook, so the wind rings for them. Some hooks are bare, for the ones nobody claimed. A bell costs a copper to me and a sovereign to you." She says it without a trace of reproach. "Sloe, on the third landing."'),
      qOrphans: S('How many children?'),
      aOrphans: S('"Since the Screaming Year? More than I will say in the Yard." She looks at the sea. "You count them, and you do not say the number, and you get on."'),
      qBye: S('Thank you.'),
    },
    mags: {
      name: S('Mags Tennant'),
      polite: S('Mags watches your mouth, and then your hands. She signs: <i>Here.</i>'),
      normal: S('She nods, once, and signs: <i>Dues. Chandler. Dark.</i>'),
      blunt: S('She raises one eyebrow and goes on watching the Yard.'),
      first: S('Mags is at the foot of the mast-tower, with her back to the iron and her face to the Yard, because she always sees things first. She watches your mouth and then your hands, and signs: <i>Here.</i> Then the list, slowly: <i>Dues. Chandler. Third landing. Dark.</i> She touches her ear, then the planks: <i>The harbour hums through the boards all day. You will feel it too.</i>'),
      again: S('She signs: <i>Dues. Chandler. Back before dark.</i>'),
      bottle: S('Mags sees what you carry. Her face does not change. She signs, slowly, with both hands: <i>Not aboard. Never aboard.</i> Then she points at the Stair.'),
      ready: S('She signs: <i>Done?</i> and, when you nod, <i>Up.</i> She holds the rungs for you.'),
      qUp: S('Climb to the Kestrel.'),
      qNot: S('Not yet.'),
      doneSome: S('Not everything on the list is done. She tilts her head at that, once, as at weather, and signs: <i>Pennick will say.</i> She does not stop you.'),
    },
    wife: {
      name: S('A net-wife on the fifth landing'),
      polite: S('Mind the rail. It is a hundred and ninety feet from here to the Yard roofs, and the Yard roofs are not soft.'),
      normal: S('They light the Stair at dusk, one landing at a time, from the bottom up. The lamplighter is on his fourth in three years. I tell you so you will hold the rail.'),
      blunt: S('I am mending. If you are going to talk, hold the other end.'),
    },
    hand: {
      name: S('A deck-hand of the Yard'),
      polite: S('Mind the Twelfth. The Harbour does not forbid theft, it forbids theft from its own pocket. I was a thief nine years and never once took a nail from the Harbour.'),
      normal: S('Fish, tar and rum. In that order, on a good day.'),
      blunt: S('Not now.'),
    },
    child: {
      name: S('A child on the Cay'),
      polite: S('That one is my brother\'s. He was three. It only rings when the wind is from the west, and nowhere else.'),
      normal: S('Hesper says the crooked one rings crooked because the hook is crooked. I say it rings crooked because he was.'),
      blunt: S('Shh. You will frighten the bells.'),
    },
    // ---- the mast-tower, the end
    end: {
      title: S('The mast-tower'),
      climb: S('Sixty feet of wet iron rungs, and the Drift-Kestrel at the top of them, murmuring. Mags is watching your hands.'),
      climbNone: S('You have done none of Pennick\'s list. Go up anyway?'),
      goUp: S('Climb.'),
      notYet: S('Not yet.'),
      bottle: S('You cannot take the bottle aboard. Never on a ship. The Coast is very firm about it, and so is Marrin Tace, and so, now, are you.'),
      up: S('You climb. The rungs are cold and every one of them is wet, and at the top the Kestrel\'s deck takes your weight as if it had been waiting. Below you the harbour goes on, with nothing still in it.'),
      resTitle: S('A trip to Port Cantabile'),
      resDues: S('You paid the dues at the slack.'),
      resNoDues: S('The dues are unpaid, and the Harbour has a long memory.'),
      resValve: S('Pennick has his valve.'),
      resNoValve: S('Pennick has no valve, and an opinion about it.'),
      resRung: S('The Mole-bell rang once, for a bottle.'),
      resSold: S('The bottle went into the Office\'s box.'),
      resNone: S('The bottle is still on a shelf on the fourth landing.'),
      resBell: S('A bell hangs on a hook that was bare.'),
      resHeard: S('You can tell the hour from the sea.'),
    },
    jour: {
      dues: S('I paid the Kestrel\'s mooring dues into the Harbour-Queen\'s own hand, at the slack. Six sovereigns, and a receipt with a chalk stamp on it.'),
      valve: S('Fenwick Sloe, the chandler on the third landing, sold me the gauge-valve for Pennick for five sovereigns, on the Harbour\'s receipt.'),
      bellHeard: S('The Mole-bell rang once while I was walking the Yard. Nobody said whose it was.'),
      salvage: S('I lifted a crate under the Sixteenth Article. The Harbour took its fifth, honestly.'),
    },
    key: {
      receipt: S('The Harbour\'s Receipt'),
      receiptDesc: S('A slip of tarred paper with a chalk stamp, and the Harbour-Queen\'s hand across it. DUES PAID, AT THE SLACK.'),
      valve: S('A Gauge-Valve'),
      valveDesc: S('A brass gauge-valve for a lift-tank, in a twist of oiled cloth. Fortis brass, the chandler says. Mostly.'),
      bottle: S('Marrin Tace\'s Bottle'),
      bottleDesc: S('A blue glass bottle, wax-sealed, J. TACE and a four in chalk. It is not to be opened, not to be sold, and not to be taken aboard a ship.'),
      bottleUse: S('Never take the stopper out. That is the first thing anyone on the Coast tells you, and the last.'),
      gravebell: S('A Small Bell'),
      gravebellDesc: S('A small bronze bell on an iron hook, no bigger than a cup. For a grave on the Cay that has none.'),
    },
    place: {
      mole: S('the Mole-head'),
      stair: S('the Salt Stair'),
      office: S('the Harbour office'),
      chandler: S('the chandler\'s'),
      cistern: S('the counting-house'),
      cay: S('the Cay boat'),
      mast: S('the mast-tower'),
      steps: S('the Yard steps'),
      widow: S('Mistress Tace\'s door'),
    },
    topic: {
      vox: S('A bottle is a drowned man\'s breath with a stopper in it, or a thing that learned his name off the water, or nothing at all. Nobody can tell which until the wax is broken. The Coast has a rule for that: never take the stopper out.'),
      hush: S('It keeps what it takes. Nobody on the Coast says more than that, and nobody says it loudly.'),
      church: S('The Flambeaux have had the counting-house since the spring, up at the top of the Stair. They pay for talk, and the Lantern Yard has plenty.'),
      synod: S('The Synod taxed this harbour for a hundred years and has never once been thanked for it.'),
      kestrel: S('The airship on the mast-tower. She came in on the morning tide, and half the Yard has already worked out what she is carrying.'),
      cacoph: S('The hounds came down out of the hills the same year the quiets came up out of the trenches. The Coast has both. We do not discuss which is worse.'),
    },
  };

  // ---------------------------------------------------------------- art (procedural stand-ins, painted once)
  const rng = typeof mulberry32 === 'function' ? mulberry32 : (a) => () => (a = (a * 16807) % 2147483647) / 2147483647;
  function paint(w, h, fn) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true });
    fn(x, w, h);
    const id = x.getImageData(0, 0, w, h);
    return new Uint32Array(id.data.buffer.slice(0));
  }
  const E = (x, cx, cy, rx, ry, fill, rot) => { x.beginPath(); x.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2); x.fillStyle = fill; x.fill(); };
  const R = (x, x0, y0, w, h, fill) => { x.fillStyle = fill; x.fillRect(x0, y0, w, h); };
  const P = (x, pts, fill, stroke) => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]); x.closePath(); x.fillStyle = fill; x.fill(); if (stroke) { x.strokeStyle = stroke; x.lineWidth = 1; x.stroke(); } };
  const L = (x, x0, y0, x1, y1, col, lw) => { x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.strokeStyle = col; x.lineWidth = lw || 1; x.stroke(); };
  const VG = (x, y0, y1, a, b) => { const g = x.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  const addSprite = (name, w, h, fn, meta) => {
    if (typeof Engine === 'undefined' || !Engine.addSprite || (Engine.sprites && Engine.sprites[name])) return;
    Engine.addSprite(name, Object.assign({ w, h, data: paint(w, h, fn), hs: 1, cx: 0.5, dy: 0 }, meta || {}));
  };
  function glowMask(name, test) {
    const sp = typeof Engine !== 'undefined' && Engine.sprites && Engine.sprites[name]; if (!sp || !Engine.setEmissive) return;
    const m = new Uint8Array(sp.w * sp.h); let n = 0;
    for (let i = 0; i < m.length; i++) { const p = sp.data[i], a = p >>> 24; if (a < 120) continue; const r = p & 255, g = (p >>> 8) & 255, b = (p >>> 16) & 255; if (test(r, g, b)) { m[i] = 1; n++; } }
    if (n) Engine.setEmissive(name, m);
  }
  const warmBright = (r, g, b) => r > 230 && g > 190 && b < 190;
  function tintSprite(src, dst, k) {
    const sp = typeof Engine !== 'undefined' && Engine.sprites && Engine.sprites[src]; if (!sp || Engine.sprites[dst]) return;
    const d = new Uint32Array(sp.data.length);
    for (let i = 0; i < d.length; i++) {
      const p = sp.data[i], a = p >>> 24;
      if (!a) { d[i] = p; continue; }
      const r = Math.min(255, (p & 255) * k[0]), g = Math.min(255, ((p >>> 8) & 255) * k[1]), b = Math.min(255, ((p >>> 16) & 255) * k[2]);
      d[i] = ((a << 24) | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0)) >>> 0;
    }
    Engine.addSprite(dst, Object.assign({}, sp, { data: d }));
  }
  function hsh(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 2246822519) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vnoise(x, y, cx, cy, s) {             // periodic value noise over a 64 tile, cells of cx by cy texels
    const nx = 64 / cx, ny = 64 / cy, fx = x / cx, fy = y / cy, x0 = Math.floor(fx), y0 = Math.floor(fy), u = fx - x0, v = fy - y0;
    const X0 = ((x0 % nx) + nx) % nx, X1 = (X0 + 1) % nx, Y0 = ((y0 % ny) + ny) % ny, Y1 = (Y0 + 1) % ny;
    const a = hsh(X0, Y0, s), b = hsh(X1, Y0, s), c = hsh(X0, Y1, s), d = hsh(X1, Y1, s), su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
    return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv;
  }

  // wall and floor textures. Floors read the world as tx = x across the cell, ty = y down the cell (engine.js).
  const TEXN = { cliff: 'p17c_cliff', stLo: 'p17c_stlo', stHi: 'p17c_sthi', mole: 'p17c_mole', flags: 'p17c_flags', plank: 'p17c_plank', quay: 'p17c_quay', retain: ['p17c_retain', 'p17c_retain2', 'p17c_retain3'], ash: 'p17c_ashlar', shut: 'p17c_shutter', slate: 'p17c_slate', pl: ['p17c_plaster', 'p17c_plaster2', 'p17c_plaster3'], rail: 'p17c_rail', door: 'p17c_door', para: 'p17c_parapet', front: ['p17c_front', 'p17c_front2', 'p17c_front3'] };
  const plasterAt = (x, y) => TEXN.pl[(x * 5 + y * 3 + (x >> 1)) % 3];
  function paintTextures() {
    if (typeof Engine === 'undefined' || !Engine.addTexture || !Engine.textures || !Engine.textures.t_wood) return;
    const make = (name, fn) => {
      if (Engine.textures[name]) return;
      const d = new Uint32Array(64 * 64);
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
        const o = fn(x, y);
        d[y * 64 + x] = (255 << 24) | ((clamp(o[2], 0, 255) | 0) << 16) | ((clamp(o[1], 0, 255) | 0) << 8) | (clamp(o[0], 0, 255) | 0);
      }
      Engine.addTexture(name, d);
    };
    // the cliff (POLISH17): dark wet rock in vertical joints, salt and wet streaks running down it, lichen in patches, and a
    // no horizontal line in it (on a relief map a face repeats once a unit, so any band would stripe the whole cliff);
    // nothing in it reads as courses of masonry.
    make(TEXN.cliff, (x, y) => {
      const n1 = vnoise(x, y, 32, 64, 11), n2 = vnoise(x, y, 8, 16, 12), n3 = vnoise(x, y, 4, 4, 13);
      let k = 0.62 + 0.3 * n1 + 0.16 * n2 + 0.1 * n3;
      const jx = (x + 9 * vnoise(x, y, 64, 32, 14)) % 32;                                          // two wandering vertical joints a tile
      if (jx < 1.6) k *= 0.42; else if (jx < 2.6) k *= 0.7; else if (jx > 30.6) k *= 1.12;
      const jx2 = (x + 21 + 7 * vnoise(x, y, 64, 16, 15)) % 64;
      if (jx2 < 1.2) k *= 0.55;
      let r = 92 * k, g = 88 * k, b = 80 * k;
      const wet = vnoise(x, y, 4, 64, 16);                                                          // wet streaks: darker, a little green
      if (wet > 0.66) { const t = (wet - 0.66) * 2.2; r *= 1 - 0.32 * t; g *= 1 - 0.24 * t; b *= 1 - 0.3 * t; }
      if (vnoise(x, y, 2, 64, 17) > 0.86) { r = r * 0.6 + 70; g = g * 0.6 + 72; b = b * 0.6 + 70; }        // salt, running down
      const li = vnoise(x, y, 8, 8, 18);
      if (li > 0.78) { const t = (li - 0.78) * 4; r = r * (1 - 0.35 * t) + 48 * t; g = g * (1 - 0.2 * t) + 52 * t; b *= 1 - 0.45 * t; }   // lichen
      return [r, g, b];
    });
    // the Salt Stair's treads: three steps a cell along x, a lit nosing and a dark riser, worn dips, and the gutter's wet channel
    // along one long edge (the two rows of a flight meet at the gutter, one 'lo' edge and one 'hi' edge)
    const stair = (gut) => (x, y) => {
      const s = (x * 3) / 64, fr = s - Math.floor(s);                                          // 0..1 along one step
      let k = 0.78 + 0.36 * fr; if (fr < 0.1) k = 1.15; else if (fr > 0.9) k = 0.48;           // nosing highlight, riser shadow
      const worn = Math.sin((y / 64) * Math.PI) * 0.1; k -= worn * (1 - fr) * 0.8;
      k *= 0.86 + 0.28 * vnoise(x, y, 4, 4, 21);
      let r = 106 * k, g = 104 * k, b = 98 * k;
      const d = gut === 'lo' ? y : 63 - y;                                                        // distance from the gutter edge
      if (d < 9) {                                                                                // the gutter: dark, wet, a thin bright runnel
        const t = d / 9; r *= 0.5 + 0.4 * t; g = g * (0.52 + 0.4 * t) + 5 * (1 - t); b = b * (0.55 + 0.4 * t) + 12 * (1 - t);
        if (d >= 2 && d <= 3) { r += 26; g += 40; b += 52; }
      }
      if (vnoise(x, y, 10, 6, 22) > 0.9) { r *= 0.7; g = g * 0.9 + 10; b *= 0.7; }                // weed in a corner
      return [r, g, b];
    };
    make(TEXN.stLo, stair('lo')); make(TEXN.stHi, stair('hi'));
    // the Mole: big granite blocks, green at the joints, rust at the iron rings
    make(TEXN.mole, (x, y) => {
      const row = (y / 21.33) | 0, off = (row % 2) * 16, bx = ((x + off) % 32), by = y % 21;
      let k = 0.75 + 0.4 * vnoise(x, y, 8, 8, 31);
      if (bx < 1.5 || by < 1.5) k *= 0.5;
      let r = 112 * k, g = 112 * k, b = 108 * k;
      if ((bx < 2.5 || by < 2.5) && vnoise(x, y, 4, 4, 32) > 0.5) { g += 14; r *= 0.85; }
      if (vnoise(x, y, 16, 16, 33) > 0.85) { r = r * 0.7 + 30; g = g * 0.7 + 10; b *= 0.6; }
      return [r, g, b];
    });
    // the yard's flagstones: wet, a blue-grey sheen, irregular joints
    make(TEXN.flags, (x, y) => {
      const cx = Math.floor(x / 21.33 + 0.5 * ((y / 21.33) | 0)), j = Math.min(x % 21.33, y % 21.33);
      let k = 0.82 + 0.26 * hsh(cx, (y / 21.33) | 0, 41) + 0.1 * vnoise(x, y, 6, 6, 42);
      if (j < 1.4) k *= 0.55;
      return [100 * k, 104 * k, 106 * k + 4];
    });
    make(TEXN.plank, (x, y) => {
      const pl = (y / 16) | 0, e = y % 16; let k = 0.72 + 0.4 * hsh(pl, 3, 51) + 0.18 * vnoise(x, y, 32, 3, 52);
      if (e < 1.5) k *= 0.4;
      if ((x + pl * 23) % 64 < 1.5) k *= 0.55;
      return [118 * k, 90 * k, 62 * k];
    });
    // the quay face (the Yard's edge, a low wall at the waterline): dressed granite courses, weed-furred at the foot
    make(TEXN.quay, (x, y) => {
      const row = (y / 16) | 0, off = (row % 2) * 16, bx = (x + off) % 32; let k = 0.78 + 0.34 * hsh(row, ((x + off) / 32) | 0, 61);
      if (bx < 1.5 || y % 16 < 1.5) k *= 0.5;
      let r = 108 * k, g = 108 * k, b = 104 * k;
      const w = clamp((y - 40) / 24, 0, 1); r *= 1 - 0.35 * w; g = g * (1 - 0.08 * w) + 16 * w; b *= 1 - 0.4 * w;
      return [r, g, b];
    });
    // the Stair's retaining walls (tall, seen from the flights and from below): rough ashlar in three variants, patchy moss
    // and salt, with no band that would repeat at every unit of height
    TEXN.retain.forEach((nm, i) => make(nm, (x, y) => {
      // POLISH17: the Stair's walls are cut from the cliff and faced roughly: dark, wet, big irregular stones
      const row = ((y + 6 + 6 * vnoise(x, 0, 16, 64, 129 + i)) / 21) | 0, off = ((row + i) % 2) * 17, bx = (x + off) % 34, by = (y + 6 + 6 * vnoise(x, 0, 16, 64, 129 + i)) % 21, id = hsh(row, ((x + off) / 34) | 0, 130 + i);
      let k = 0.56 + 0.3 * id + 0.18 * vnoise(x, y, 5, 5, 140 + i);
      if (bx < 1.2 || by < 1.2) k *= 0.58;
      let r = 90 * k, g = 87 * k, b = 80 * k;
      const mv = vnoise(x, y, 14, 14, 150 + i);
      if (mv > 0.7) { const t = (mv - 0.7) * 3; r *= 1 - 0.3 * t; g = g * (1 + 0.04 * t) + 8 * t; b *= 1 - 0.35 * t; }
      if (vnoise(x, y, 4, 40, 160 + i) > 0.8) { r *= 0.72; g *= 0.74; b *= 0.76; }                // wet runs from the gutter
      return [r, g, b];
    }));
    // the Yard's lime-washed houses: salt streaked down from the sills (three variants)
    [[236, 230, 214], [226, 216, 196], [214, 220, 214]].forEach((c, i) => make(TEXN.pl[i], (x, y) => {
      let k = 0.9 + 0.18 * vnoise(x, y, 6, 6, 71 + i);
      if (vnoise(x, y, 4, 36, 75 + i) > 0.74) { k *= 0.78; }                                      // a salt streak
      const sill = (y % 64) > 52 && (y % 64) < 56; if (sill) k *= 0.62;
      let r = c[0] * k * 0.8, g = c[1] * k * 0.8, b = c[2] * k * 0.8;
      if (y > 50) { r *= 0.85; g *= 0.92; b *= 0.9 + 0.04 * vnoise(x, y, 8, 8, 78); }              // damp at the foot
      return [r, g, b];
    }));
    // the Stair's parapet (POLISH17): pale dressed coping along the edge of every flight, iron stanchions leaded into it
    make(TEXN.para, (x, y) => {
      let k = 0.86 + 0.12 * vnoise(x, y, 6, 6, 191);
      if (x % 21 < 1.2) k *= 0.62;                                                                   // joints between the copings
      if (y < 4) k *= 1.12; else if (y > 26) k *= 0.6;                                               // the lit top, the shadowed foot
      let r = 168 * k, g = 164 * k, b = 152 * k;
      if ((x + 4) % 16 < 2 && y > 4 && y < 26) { r = 52; g = 54; b = 58; }                            // a stanchion's lead socket
      if (vnoise(x, y, 4, 12, 192) > 0.82) { r *= 0.8; g *= 0.86; b *= 0.8; }                        // lichen
      return [r, g, b];
    });
    // the fronts of the houses on the cliff (POLISH17): the same lime-wash, a shuttered window to each storey (the texture
    // repeats once a unit of height, so a house two units tall shows two), a dark lintel, salt under the sill
    [[236, 230, 214], [226, 214, 192], [216, 222, 214]].forEach((c, i) => make(TEXN.front[i], (x, y) => {
      let k = 0.9 + 0.16 * vnoise(x, y, 6, 6, 171 + i);
      if (vnoise(x, y, 4, 36, 175 + i) > 0.76) k *= 0.8;
      let r = c[0] * k * 0.82, g = c[1] * k * 0.82, b = c[2] * k * 0.82;
      const wx0 = 20 + (i * 3), wx1 = wx0 + 22, wy0 = 18, wy1 = 42;
      if (x >= wx0 && x < wx1 && y >= wy0 && y < wy1) {                                             // the window: dark glass in a frame, a glazing bar
        const fr = x < wx0 + 2 || x >= wx1 - 2 || y < wy0 + 2 || y >= wy1 - 2, bar = Math.abs(x - (wx0 + wx1) / 2) < 1 || Math.abs(y - (wy0 + wy1) / 2) < 1;
        if (fr || bar) { r = 70; g = 54; b = 40; } else { r = 36 + 10 * (y < 26 ? 1 : 0); g = 44 + 10 * (y < 26 ? 1 : 0); b = 54 + 12 * (y < 26 ? 1 : 0); }
      } else if ((x >= wx0 - 8 && x < wx0 && y >= wy0 && y < wy1) || (x >= wx1 && x < wx1 + 8 && y >= wy0 && y < wy1)) {   // the shutters, open
        const pl = (x % 4) === 0; r = (pl ? 58 : 84) + i * 6; g = (pl ? 70 : 98) - i * 4; b = (pl ? 74 : 104) - i * 10;
      } else if (y >= wy0 - 4 && y < wy0 - 1 && x >= wx0 - 2 && x < wx1 + 2) { r *= 0.5; g *= 0.48; b *= 0.46; }   // the lintel
      else if (y >= wy1 && y < wy1 + 3 && x >= wx0 - 3 && x < wx1 + 3) { r *= 1.08; g *= 1.08; b *= 1.08; }      // the sill
      else if (y >= wy1 + 3 && y < 58 && x >= wx0 + 4 && x < wx1 - 4 && vnoise(x, y, 3, 20, 178 + i) > 0.6) { r *= 0.86; g *= 0.88; b *= 0.9; }   // salt run under it
      if (y > 60) { r *= 0.7; g *= 0.7; b *= 0.72; }                                                  // the floor line between storeys
      return [r, g, b];
    }));
    // coastal turf for the Cay and the cliff-tops (POLISH17): salt-bitten grey-green, tussocks, dry blades, sea-pinks and
    // pale stones (the game's t_grass is a mustard lawn); turf2 is the same with more stone and less grass
    const turf = (seed, stone) => (x, y) => {
      const n = vnoise(x, y, 16, 16, seed), t = vnoise(x, y, 6, 6, seed + 1), f = vnoise(x, y, 3, 3, seed + 2);
      let r = 88 + 22 * n, g = 96 + 18 * n, b = 78 + 10 * n;
      if (t > 0.62) { const k = (t - 0.62) * 2.4; r -= 22 * k; g -= 16 * k; b -= 14 * k; }                       // tussock shadow
      if (f > 0.76 && ((x + y * 3) % 5) < 2) { r += 22; g += 20; b += 12; }                                       // dry blades catching the light
      if (hsh(x >> 1, y >> 1, seed + 3) > 0.996) { r = 176; g = 120; b = 132; }                                    // a sea-pink
      const st = vnoise(x, y, 8, 8, seed + 4);
      if (st > 1 - stone) { const k = Math.min(1, (st - (1 - stone)) * 6); r = r * (1 - k) + 150 * k; g = g * (1 - k) + 148 * k; b = b * (1 - k) + 138 * k; }   // a pale stone
      return [r, g, b];
    };
    make('p17c_turf', turf(201, 0.1)); make('p17c_turf2', turf(211, 0.22));
    // the counting-house: square ashlar, dark with age, with a pale band of coping
    make(TEXN.ash, (x, y) => {
      const row = (y / 16) | 0, off = (row % 2) * 16, bx = (x + off) % 32; let k = 0.62 + 0.36 * hsh(row, ((x + off) / 32) | 0, 81) + 0.1 * vnoise(x, y, 4, 4, 82);
      if (bx < 1.4 || y % 16 < 1.4) k *= 0.46;
      return [96 * k, 92 * k, 88 * k];
    });
    // iron shutters, bolted, rust-streaked
    make(TEXN.shut, (x, y) => {
      let k = 0.6 + 0.2 * vnoise(x, y, 8, 8, 91); const bx = x % 32, rib = bx < 2 || bx > 30 || y % 32 < 2;
      let r = 62 * k, g = 66 * k, b = 70 * k; if (rib) { r *= 0.6; g *= 0.6; b *= 0.65; }
      if (((x % 32 === 5 || x % 32 === 26) && (y % 32 === 5 || y % 32 === 26))) { r = 150; g = 154; b = 156; }
      if (vnoise(x, y, 3, 30, 92) > 0.78) { r += 52; g += 22; }
      return [r, g, b];
    });
    make(TEXN.slate, (x, y) => {
      const row = (y / 12) | 0, off = (row % 2) * 8, bx = (x + off) % 16; let k = 0.6 + 0.4 * hsh(row, ((x + off) / 16) | 0, 101);
      if (bx < 1 || y % 12 < 1.5) k *= 0.45;
      return [60 * k, 66 * k, 74 * k + 6];
    });
    // the low rail's face and the iron cable plate
    make(TEXN.rail, (x, y) => {
      let k = 0.7 + 0.2 * vnoise(x, y, 8, 8, 111); const v = (y > 8 && y < 14) || (y > 40 && y < 46);
      if (v) return [66 * k, 70 * k, 74 * k];
      if (x % 32 < 4) return [74 * k, 62 * k, 52 * k];
      return [88 * k, 84 * k, 78 * k];
    });
    // a shuttered door: dark timber, iron straps, a ring
    make(TEXN.door, (x, y) => {
      let k = 0.5 + 0.3 * vnoise(x, y, 4, 40, 121); const pl = x % 16 < 1.2;
      if (pl) k *= 0.5;
      let r = 90 * k, g = 66 * k, b = 46 * k; if ((y > 10 && y < 15) || (y > 48 && y < 53)) { r = 54; g = 56; b = 60; }
      if (Math.hypot(x - 50, y - 34) < 3.2 && Math.hypot(x - 50, y - 34) > 1.8) { r = 170; g = 150; b = 90; }
      return [r, g, b];
    });
  }

  // props
  const GOLD = 'rgba(255,214,120,';
  function paintProps() {
    // a harbour lamp-post: iron, a lantern cage, a small gold flame
    addSprite('p17c_lamppost', 28, 80, (x) => {
      E(x, 14, 77, 9, 2.4, 'rgba(0,0,0,0.3)');
      R(x, 12.5, 24, 3, 52, VG(x, 24, 76, '#4a4c50', '#26282c')); R(x, 9, 70, 10, 6, '#34363a'); R(x, 10.5, 60, 7, 2, '#3a3c40');
      R(x, 8, 12, 12, 3, '#2c2e32'); R(x, 8, 23, 12, 3, '#2c2e32'); R(x, 9, 15, 10, 8, 'rgba(255,224,150,0.5)');
      L(x, 8, 15, 8, 23, '#2c2e32', 1.2); L(x, 20, 15, 20, 23, '#2c2e32', 1.2);
      E(x, 14, 19, 3.2, 4, '#ffe9a8'); E(x, 14, 19.4, 1.5, 2.2, '#ffffff'); P(x, [[8, 12], [14, 5], [20, 12]], '#2c2e32');
      E(x, 14, 19, 11, 11, GOLD + '0.14)');
    });
    glowMask('p17c_lamppost', (r, g, b) => r > 235 && g > 220 && b > 150);
    // a lantern hung from a hook: bracket, chain, cage, flame
    addSprite('p17c_lantern', 24, 56, (x) => {
      L(x, 12, 0, 12, 14, '#2c2e32', 1.4); R(x, 6, 14, 12, 3, '#2c2e32'); R(x, 7, 17, 10, 16, 'rgba(255,220,140,0.45)'); R(x, 6, 33, 12, 3, '#2c2e32');
      L(x, 7, 17, 7, 33, '#2c2e32', 1); L(x, 17, 17, 17, 33, '#2c2e32', 1); E(x, 12, 26, 3.2, 5, '#ffe6a0'); E(x, 12, 26.6, 1.4, 2.4, '#fff');
      E(x, 12, 26, 9, 11, GOLD + '0.14)');
    });
    glowMask('p17c_lantern', (r, g, b) => r > 235 && g > 215 && b > 140);
    // by day the lamps are out (POLISH17): the same iron, dark glass, a cold wick; the spar's lantern burns low all day
    addSprite('p17c_lamppost_off', 28, 80, (x) => {
      E(x, 14, 77, 9, 2.4, 'rgba(0,0,0,0.3)');
      R(x, 12.5, 24, 3, 52, VG(x, 24, 76, '#4a4c50', '#26282c')); R(x, 9, 70, 10, 6, '#34363a'); R(x, 10.5, 60, 7, 2, '#3a3c40');
      R(x, 8, 12, 12, 3, '#2c2e32'); R(x, 8, 23, 12, 3, '#2c2e32'); R(x, 9, 15, 10, 8, VG(x, 15, 23, '#5a6466', '#3a4244'));
      L(x, 8, 15, 8, 23, '#2c2e32', 1.2); L(x, 20, 15, 20, 23, '#2c2e32', 1.2); R(x, 11, 16, 2, 6, 'rgba(220,235,240,0.35)'); R(x, 13.4, 19, 1.2, 3, '#1a1a1a');
      P(x, [[8, 12], [14, 5], [20, 12]], '#2c2e32');
    });
    const lanternOff = (flame) => (x) => {
      L(x, 12, 0, 12, 14, '#2c2e32', 1.4); R(x, 6, 14, 12, 3, '#2c2e32'); R(x, 7, 17, 10, 16, VG(x, 17, 33, '#5a6466', '#3a4244')); R(x, 6, 33, 12, 3, '#2c2e32');
      L(x, 7, 17, 7, 33, '#2c2e32', 1); L(x, 17, 17, 17, 33, '#2c2e32', 1); R(x, 8.5, 18, 1.6, 9, 'rgba(220,235,240,0.35)');
      if (flame) { E(x, 12, 28, 1.4, 2.2, '#ffd890'); E(x, 12, 28.6, 0.7, 1, '#fff4d0'); } else R(x, 11.4, 27, 1.2, 4, '#1a1a1a');
    };
    addSprite('p17c_lantern_off', 24, 56, lanternOff(false));
    addSprite('p17c_lantern_low', 24, 56, lanternOff(true));
    glowMask('p17c_lantern_low', (r, g, b) => r > 235 && g > 200 && b > 120);
    // the mast-tower: a tall iron lattice with rungs, and a gantry at the top where the Kestrel moors
    addSprite('p17c_mast', 48, 192, (x) => {
      R(x, 17, 4, 3, 188, VG(x, 4, 192, '#5a5c60', '#2c2e32')); R(x, 28, 4, 3, 188, VG(x, 4, 192, '#4e5054', '#26282c'));
      for (let y = 190; y > 10; y -= 6) { L(x, 20, y, 28, y, '#7a7c78', 1.4); }
      for (let y = 188; y > 14; y -= 24) { L(x, 20, y, 29, y - 24, '#3c3e42', 1); L(x, 29, y, 20, y - 24, '#3c3e42', 1); }
      R(x, 6, 2, 36, 4, '#2c2e32'); L(x, 6, 4, 12, 14, '#2c2e32', 1.4); L(x, 42, 4, 36, 14, '#2c2e32', 1.4);
      R(x, 12, 186, 24, 6, '#34363a'); E(x, 24, 190, 14, 2, 'rgba(0,0,0,0.3)');
      for (let i = 0; i < 9; i++) E(x, 19 + (i * 7) % 12, 20 + i * 19, 1.1, 5, 'rgba(180,90,50,0.35)');
    });
    // the derrick on the Mole-head: a boom, a mast, a pulley, a rope with a hook
    addSprite('p17c_derrick', 112, 120, (x) => {
      R(x, 20, 20, 6, 98, VG(x, 20, 118, '#6a4a30', '#3a2818')); L(x, 23, 24, 96, 56, '#5a3c26', 5); L(x, 23, 40, 80, 72, '#3a2818', 1.4); L(x, 23, 24, 12, 118, '#3a2818', 1.4);
      L(x, 96, 56, 96, 96, '#c9b890', 1.1); P(x, [[92, 96], [100, 96], [96, 106]], '#34363a'); E(x, 96, 56, 4, 4, '#34363a'); E(x, 96, 56, 1.8, 1.8, '#8a8c88');
      R(x, 8, 112, 40, 6, '#34363a'); L(x, 23, 24, 50, 30, '#9a8a6a', 1.1); E(x, 23, 22, 3.4, 3.4, '#34363a');
    });
    // the Mole-bell: an iron frame, a great bronze bell, a rope to the stones
    addSprite('p17c_molebell', 64, 96, (x) => {
      E(x, 32, 93, 20, 2.6, 'rgba(0,0,0,0.35)'); R(x, 8, 12, 5, 80, VG(x, 12, 92, '#4a4c50', '#26282c')); R(x, 51, 12, 5, 80, VG(x, 12, 92, '#4a4c50', '#26282c')); R(x, 6, 8, 52, 6, '#34363a');
      L(x, 10, 90, 20, 50, '#34363a', 2); L(x, 54, 90, 44, 50, '#34363a', 2);
      x.beginPath(); x.moveTo(20, 24); x.quadraticCurveTo(20, 48, 14, 58); x.lineTo(50, 58); x.quadraticCurveTo(44, 48, 44, 24); x.closePath(); x.fillStyle = VG(x, 24, 58, '#d8a85a', '#8a6030'); x.fill();
      L(x, 25, 28, 22, 56, 'rgba(255,240,190,0.5)', 2); E(x, 32, 58, 18, 3, '#6a4820'); E(x, 32, 24, 12, 4, '#a07a40'); R(x, 29, 12, 6, 12, '#34363a');
      L(x, 32, 58, 32, 94, '#cdb890', 1.6); E(x, 32, 63, 3.6, 3, '#4a3a22');
    });
    // moored boats: a hull, a stubby mast, and the carillon rail, a bar of bronze tubes at the shroud-head
    const boat = (seed, col) => (x) => {
      const r = rng(seed); E(x, 48, 54, 44, 3.4, 'rgba(10,30,40,0.5)');
      P(x, [[4, 34], [92, 34], [84, 52], [16, 52]], VG(x, 34, 52, col[0], col[1]), '#1a120c'); L(x, 8, 38, 88, 38, col[2], 1.4);
      R(x, 46, 6, 3, 30, '#3a2a1e'); L(x, 48, 8, 12, 34, '#7a6a52', 0.8); L(x, 48, 8, 88, 34, '#7a6a52', 0.8);
      for (let i = 0; i < 6; i++) { const h = 10 + (i * 5) % 9, bx = 38 + i * 3.6; R(x, bx, 14, 2.4, h, VG(x, 14, 14 + h, '#e8c070', '#9a7236')); }
      R(x, 36, 12, 24, 2, '#3a2a1e');
      for (let i = 0; i < 4; i++) E(x, 20 + r() * 56, 41 + r() * 8, 3, 1.2, 'rgba(255,255,255,0.12)');
    };
    addSprite('p17c_boat1', 96, 60, boat(5, ['#5a6a78', '#2c3640', '#9aa6a8']));
    addSprite('p17c_boat2', 96, 60, boat(9, ['#7a4a32', '#3c2418', '#d8b070']));
    addSprite('p17c_coil', 44, 28, (x) => { E(x, 22, 25, 18, 3, 'rgba(0,0,0,0.3)'); for (let i = 0; i < 5; i++) { E(x, 22, 20 - i * 3, 16 - i, 5 - i * 0.2, i % 2 ? '#2e2418' : '#3c2e1e'); E(x, 22, 19 - i * 3, 15 - i, 4.4 - i * 0.2, i % 2 ? '#4a3a26' : '#54442c'); } E(x, 22, 9, 4, 2, '#1c140c'); });
    addSprite('p17c_net', 88, 64, (x) => {
      R(x, 6, 10, 3, 52, '#4a3a28'); R(x, 79, 10, 3, 52, '#4a3a28'); L(x, 7, 12, 80, 12, '#6a5a40', 1.4);
      x.strokeStyle = 'rgba(150,140,110,0.7)'; x.lineWidth = 0.9;
      for (let i = 0; i < 14; i++) { x.beginPath(); x.moveTo(9 + i * 5, 12); x.quadraticCurveTo(9 + i * 5 + 2, 36, 9 + i * 5, 54 + (i % 3) * 2); x.stroke(); }
      for (let j = 0; j < 8; j++) { x.beginPath(); x.moveTo(9, 16 + j * 5.5); x.quadraticCurveTo(44, 24 + j * 5.5, 80, 16 + j * 5.5); x.stroke(); }
      for (let i = 0; i < 5; i++) E(x, 14 + i * 15, 56, 2.4, 2, '#c8b080');
    });
    addSprite('p17c_wash', 88, 56, (x) => {
      R(x, 5, 6, 3, 48, '#4a3a28'); R(x, 80, 6, 3, 48, '#4a3a28'); x.strokeStyle = '#8a7a5a'; x.lineWidth = 1; x.beginPath(); x.moveTo(7, 10); x.quadraticCurveTo(44, 16, 81, 10); x.stroke();
      const cols = ['#e8e0d0', '#c8d0d8', '#d8c8a8', '#a8b8c8', '#e0d8c0'];
      for (let i = 0; i < 5; i++) { const px = 12 + i * 14, h = 16 + (i * 7) % 12; P(x, [[px, 11 + i % 2], [px + 11, 12], [px + 10, 12 + h], [px + 1, 12 + h - (i % 3)]], cols[i], 'rgba(0,0,0,0.25)'); }
    });
    // a small bronze bell on an iron hook, over a low mound; and the bare hook
    // a small bronze bell on an iron hook at the head of a child's grave, and the bare hook (POLISH17: painted larger, so
    // that from the path the hooks and the bells read against the turf and the sky)
    const mound = (x) => { E(x, 20, 61, 17, 2.6, 'rgba(0,0,0,0.3)'); x.beginPath(); x.moveTo(3, 61); x.quadraticCurveTo(8, 50, 20, 50); x.quadraticCurveTo(32, 50, 37, 61); x.closePath(); x.fillStyle = VG(x, 50, 61, '#6e7a54', '#3e4630'); x.fill();
      for (const [sx, sy] of [[10, 58], [16, 55], [25, 56], [30, 59]]) E(x, sx, sy, 2, 1.2, '#9a988c'); };
    const crook = (x) => { R(x, 17, 10, 3, 44, '#2e3034'); R(x, 17, 10, 1, 44, '#4a4c50'); x.beginPath(); x.moveTo(18.5, 11); x.quadraticCurveTo(19, 4, 26, 4); x.quadraticCurveTo(32, 5, 31, 11); x.strokeStyle = '#2e3034'; x.lineWidth = 2.6; x.stroke(); };
    addSprite('p17c_gravebell', 40, 64, (x) => {
      mound(x); crook(x);
      L(x, 31, 11, 31, 15, '#2e3034', 1.4);
      x.beginPath(); x.moveTo(27, 15); x.quadraticCurveTo(26, 24, 23, 27); x.lineTo(39, 27); x.quadraticCurveTo(36, 24, 35, 15); x.closePath(); x.fillStyle = VG(x, 15, 27, '#e8b868', '#8a6030'); x.fill();
      E(x, 31, 27.5, 8, 1.6, '#6a4820'); L(x, 28, 17, 27, 25, 'rgba(255,240,200,0.6)', 1.2); E(x, 31, 29.5, 1.6, 1.6, '#4a3418');   // lip, shine, clapper
      L(x, 31, 31, 29, 38, '#c8b088', 1); L(x, 31, 31, 33, 37, '#c8b088', 1);                                                          // a frayed bit of cord
    });
    addSprite('p17c_barehook', 40, 64, (x) => { mound(x); crook(x); L(x, 31, 11, 31, 16, '#2e3034', 1.4); L(x, 31, 16, 28, 19, '#2e3034', 1.4); });
    addSprite('p17c_sundisc', 56, 56, (x) => {
      E(x, 28, 28, 26, 26, '#6a4a1a'); E(x, 28, 28, 24, 24, VG(x, 4, 52, '#e8c870', '#a07a30')); E(x, 28, 28, 20, 20, 'rgba(0,0,0,0.12)');
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; L(x, 28 + Math.cos(a) * 12, 28 + Math.sin(a) * 12, 28 + Math.cos(a) * 22, 28 + Math.sin(a) * 22, '#7a5a20', 1.4); }
      x.beginPath(); x.moveTo(28, 14); x.quadraticCurveTo(38, 26, 32, 36); x.quadraticCurveTo(28, 30, 24, 36); x.quadraticCurveTo(18, 26, 28, 14); x.fillStyle = '#9a3a10'; x.fill();
    });
    addSprite('p17c_board', 56, 64, (x) => {
      R(x, 7, 6, 3, 56, '#4a3a28'); R(x, 46, 6, 3, 56, '#4a3a28'); R(x, 4, 8, 48, 38, '#1c2420'); x.strokeStyle = '#6a5438'; x.lineWidth = 2; x.strokeRect(4, 8, 48, 38);
      x.strokeStyle = 'rgba(230,230,220,0.8)'; x.lineWidth = 1; for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(9, 14 + i * 5.4); x.lineTo(9 + 22 + (i * 11) % 18, 14 + i * 5.4 + (i % 2) * 0.6); x.stroke(); }
      R(x, 40, 12, 6, 6, 'rgba(230,230,220,0.6)');
    });
    addSprite('p17c_articles', 56, 64, (x) => {
      R(x, 4, 4, 48, 52, '#e8e4d8'); R(x, 4, 4, 48, 52, '#14161a'); x.strokeStyle = '#e8e4d8'; x.lineWidth = 1.4; x.strokeRect(6, 6, 44, 48);
      x.fillStyle = '#e8e4d8'; for (let i = 0; i < 8; i++) R(x, 10, 11 + i * 5.2, 12 + (i * 9) % 26, 1.6, '#e8e4d8');
      R(x, 26, 56, 4, 8, '#4a3a28');
    });
    addSprite('p17c_helm', 44, 52, (x) => {
      E(x, 22, 49, 15, 2.6, 'rgba(0,0,0,0.3)'); R(x, 8, 38, 28, 8, VG(x, 38, 46, '#c89a50', '#7a5826')); x.beginPath(); x.arc(22, 24, 15, Math.PI, 0); x.lineTo(37, 38); x.lineTo(7, 38); x.closePath(); x.fillStyle = VG(x, 8, 38, '#e0b468', '#8a6228'); x.fill();
      E(x, 22, 26, 7, 5.6, '#1a2a30'); E(x, 20, 24, 2.4, 1.6, 'rgba(200,240,255,0.7)'); L(x, 12, 14, 15, 12, 'rgba(255,240,190,0.7)', 2);
      for (let i = 0; i < 6; i++) E(x, 10 + i * 4.8, 38, 1.1, 1.1, '#5a3c18'); E(x, 36, 18, 3, 3, '#7a5826'); R(x, 34, 20, 8, 3, '#7a5826');
    });
    addSprite('p17c_bottle', 28, 40, (x) => {
      E(x, 14, 38, 8, 1.8, 'rgba(0,0,0,0.3)'); x.beginPath(); x.moveTo(8, 36); x.lineTo(8, 18); x.quadraticCurveTo(8, 14, 12, 12); x.lineTo(12, 5); x.lineTo(16, 5); x.lineTo(16, 12); x.quadraticCurveTo(20, 14, 20, 18); x.lineTo(20, 36); x.closePath();
      x.fillStyle = VG(x, 5, 36, '#4a78b8', '#1e3a68'); x.fill(); R(x, 11, 3, 6, 4, '#b8a070'); L(x, 11, 16, 11, 34, 'rgba(210,235,255,0.5)', 1.4); R(x, 9, 22, 10, 6, 'rgba(230,220,190,0.8)'); R(x, 10, 24, 6, 1, '#3a2a1a');
    });
    addSprite('p17c_gull', 28, 22, (x) => {
      E(x, 14, 18, 8, 1.6, 'rgba(0,0,0,0.25)'); E(x, 14, 12, 9, 6, '#e8e8e4'); E(x, 20, 8, 4, 3.6, '#f2f2ee'); P(x, [[23, 8], [28, 9], [23, 10]], '#d8a030'); E(x, 21, 7, 0.9, 0.9, '#111');
      P(x, [[4, 10], [14, 9], [10, 15]], '#a8acb0'); L(x, 12, 17, 12, 21, '#d08030', 1.2); L(x, 16, 17, 16, 21, '#d08030', 1.2);
    });
    addSprite('p17c_cistern', 64, 72, (x) => {
      E(x, 32, 68, 26, 3, 'rgba(0,0,0,0.3)'); R(x, 8, 16, 48, 50, VG(x, 16, 66, '#56685a', '#2e3c32')); for (let i = 0; i < 6; i++) L(x, 8, 22 + i * 8, 56, 22 + i * 8, 'rgba(0,0,0,0.25)', 1);
      R(x, 6, 12, 52, 6, '#34423a'); R(x, 28, 48, 10, 6, '#2a2a2a'); R(x, 30, 54, 6, 12, 'rgba(160,200,230,0.6)');
    });
    addSprite('p17c_floatcrate', 48, 36, (x) => {
      E(x, 24, 32, 20, 2.6, 'rgba(10,40,50,0.5)'); R(x, 6, 12, 36, 18, VG(x, 12, 30, '#8a6a3c', '#5a4224')); for (let i = 0; i < 3; i++) L(x, 6, 18 + i * 5, 42, 18 + i * 5, 'rgba(0,0,0,0.35)', 1);
      L(x, 6, 12, 42, 30, 'rgba(0,0,0,0.3)', 1.2); L(x, 42, 12, 6, 30, 'rgba(0,0,0,0.3)', 1.2); for (let i = 0; i < 5; i++) E(x, 6 + i * 9, 31, 4, 1.2, 'rgba(230,250,255,0.5)');
    });
    addSprite('p17c_bench', 64, 36, (x) => { E(x, 32, 33, 26, 2.4, 'rgba(0,0,0,0.3)'); R(x, 6, 16, 52, 5, VG(x, 16, 21, '#8a6a44', '#5a4228')); R(x, 10, 21, 4, 12, '#4a3822'); R(x, 50, 21, 4, 12, '#4a3822'); R(x, 6, 8, 52, 4, '#6a5034'); });
    // the Harbour office's furniture (POLISH17): a brass stamp, a chart of the harbour and the reef, the vox-bottle shelf
    addSprite('p17c_stamp', 24, 28, (x) => { E(x, 12, 26, 9, 2, 'rgba(0,0,0,0.3)'); R(x, 5, 18, 14, 7, VG(x, 18, 25, '#c89a50', '#7a5826')); R(x, 10, 6, 4, 12, '#5a3e24'); E(x, 12, 6, 4, 3, '#7a5432'); R(x, 4, 24, 16, 2, '#3a2a1a'); });
    addSprite('p17c_chart', 64, 48, (x) => {
      R(x, 2, 2, 60, 44, '#5a4430'); R(x, 4, 4, 56, 40, '#d8caa0'); R(x, 4, 4, 56, 40, 'rgba(120,90,50,0.12)');
      x.beginPath(); x.moveTo(4, 14); x.quadraticCurveTo(18, 10, 24, 18); x.quadraticCurveTo(30, 26, 22, 34); x.lineTo(14, 44); x.lineTo(4, 44); x.closePath(); x.fillStyle = '#b8a476'; x.fill(); x.strokeStyle = '#6a5434'; x.lineWidth = 1; x.stroke();   // the cliff shore
      L(x, 24, 30, 46, 30, '#6a5434', 1.6); L(x, 46, 30, 48, 26, '#6a5434', 1.6);                                                       // the Mole
      for (let i = 0; i < 7; i++) E(x, 36 + (i * 7) % 18, 12 + (i * 5) % 12, 1.4, 1, '#4a7a6a');                                       // the reef
      for (let i = 0; i < 5; i++) L(x, 32, 22, 32 + Math.cos(i * 1.26) * 26, 22 + Math.sin(i * 1.26) * 20, 'rgba(120,60,40,0.35)', 0.8); // rhumb lines
      E(x, 52, 38, 4, 2.4, '#b8a476'); R(x, 6, 6, 14, 2, '#6a5434');                                                                    // the Cay; the title
      for (const [px, py] of [[5, 5], [59, 5], [5, 43], [59, 43]]) E(x, px, py, 1.4, 1.4, '#8a7a5a');
    });
    addSprite('p17c_voxshelf', 64, 40, (x) => {
      R(x, 2, 30, 60, 4, '#6a4a2e'); R(x, 2, 34, 60, 2, '#3a2818'); R(x, 6, 34, 3, 6, '#3a2818'); R(x, 55, 34, 3, 6, '#3a2818');
      const cols = [['#3a6aa8', '#1a3a68'], ['#3a8a7a', '#1a4a40'], ['#5a7aa0', '#2a3a58'], ['#4a6a3a', '#24361c']];
      for (let i = 0; i < 7; i++) {
        const bx = 6 + i * 8, h = 18 + (i * 5) % 6, c = cols[i % 4];
        R(x, bx, 30 - h, 6, h, VG(x, 30 - h, 30, c[0], c[1])); R(x, bx + 1.5, 30 - h - 4, 3, 4, c[1]); R(x, bx + 1, 30 - h - 6, 4, 2.4, '#b8a070');   // bottle, neck, the wax
        R(x, bx + 1, 30 - h + 2, 1, h - 4, 'rgba(210,235,255,0.45)'); R(x, bx, 30 - h / 2, 6, 3, 'rgba(232,224,196,0.85)');                       // shine, the chalk-tag
      }
    });
    addSprite('p17c_ring', 24, 24, (x) => { E(x, 12, 12, 7, 7, '#3a3c40'); E(x, 12, 12, 4.6, 4.6, 'rgba(0,0,0,0)'); x.globalCompositeOperation = 'destination-out'; E(x, 12, 12, 4.4, 4.4, '#000'); x.globalCompositeOperation = 'source-over'; R(x, 10, 2, 4, 5, '#5a4a3a'); });
    addSprite('p17c_hat', 40, 28, (x) => { E(x, 20, 22, 17, 2.6, 'rgba(0,0,0,0.3)'); E(x, 20, 18, 17, 4, '#3a3028'); x.beginPath(); x.ellipse(20, 14, 10, 8, 0, Math.PI, 0); x.fillStyle = '#4a3c30'; x.fill(); });
    ensureCoats();
  }
  // NPC coats: recoloured copies of the town's people (tried again whenever a map is built or loaded until every coat exists)
  const COATS = [
    ['townsman', 'p17c_teague', [0.8, 0.88, 1.0]], ['townswoman', 'p17c_oona', [0.7, 0.8, 1.15]], ['townswoman', 'p17c_bessa', [0.95, 0.95, 1.0]],
    ['townsman', 'p17c_teel', [1.1, 0.85, 0.7]], ['hob', 'p17c_sloe', [0.85, 0.95, 0.8]], ['townswoman', 'p17c_tace', [0.78, 0.8, 0.9]],
    ['townsman', 'p17c_dunmore', [0.7, 0.72, 0.76]], ['townswoman', 'p17c_hesper', [1.05, 0.9, 0.85]], ['townsman', 'p17c_quain', [0.78, 0.92, 1.0]],
    ['townswoman', 'p17c_wife', [0.9, 1.0, 0.88]], ['townsman', 'p17c_hand', [1.0, 0.92, 0.8]], ['townswoman', 'p17c_child', [1.15, 1.1, 1.0]],
  ];
  function ensureCoats() {
    if (typeof Engine === 'undefined' || !Engine.sprites) return false;
    let all = true;
    for (const [src, dst, k] of COATS) { if (!Engine.sprites[dst]) tintSprite(src, dst, k); if (!Engine.sprites[dst]) all = false; }
    return all;
  }

  // ---------------------------------------------------------------- the maps
  const FLOORS = ['p17c_flags', 'p17c_mole', 't_water', 't_shallows', TEXN.stLo, TEXN.stHi, 'p17c_plank', 't_grass'];
  const F = { flag: 0, mole: 1, water: 2, shal: 3, stlo: 4, sthi: 5, plank: 6, grass: 7 };
  const J = (m, sprite, x, y, o) => m.deco(sprite, x, y, o);
  const NPCAT = (m, id, sprite, x, y, face) => m.add({ kind: 'npc', id, x, y, sprite, scale: 1, solid: true, radius: 0.35, facing: face || 0 });
  const GOLD_LIGHT = [58, 40, 14];

  // The Salt Stair (all numbers are cells; a flight is two rows wide and 14 cells long; see the header). L[k] is the level of
  // landing k (L[0] is the foot, in the Yard); k is 1..6. Odd flights climb to the west, even flights to the east.
  const STAIR = {
    L: [0.4, 2.2, 4.0, 5.8, 7.6, 9.4, 11.2], FX0: 31, FX1: 44, WX0: 27, WX1: 30, EX0: 45, EX1: 48,
    ROWS: [41, 38, 35, 32, 29, 26],                                     // the first row of each flight
    LAND: [null, [38, 42], [35, 39], [32, 36], [29, 33], [26, 30], [23, 27]],   // rows of landing k (1,3,5 west; 2,4,6 east)
    BANDS: [40, 37, 34, 31, 28, 25], TOP: { x0: 27, y0: 14, x1: 48, y1: 24 }, FOOT: { x0: 45, y0: 41, x1: 48, y1: 43 },
    SHOPS: { 1: [27, 41], 2: [47, 35], 3: [27, 35], 4: [47, 29], 5: [27, 29] },   // door cells of the shopfronts on landings 1..5
  };
  const HOUSE_X = [5, 12, 19, 26];
  // the level of the walker's floor at a cell (null where there is none): used by the builder, the tests and the lamps
  function stairLevel(x, y) {
    const S_ = STAIR, T_ = S_.TOP;
    if (x >= T_.x0 && x <= T_.x1 && y >= T_.y0 && y <= T_.y1) return S_.L[6];
    if (x >= S_.FOOT.x0 && x <= S_.FOOT.x1 && y >= S_.FOOT.y0 && y <= S_.FOOT.y1) return S_.L[0];
    for (let k = 1; k <= 6; k++) {
      const lr = S_.LAND[k], west = k % 2 === 1;
      if (y >= lr[0] && y <= lr[1] && x >= (west ? S_.WX0 : S_.EX0) && x <= (west ? S_.WX1 : S_.EX1)) return S_.L[k];
    }
    for (let k = 1; k <= 6; k++) {
      const r0 = S_.ROWS[k - 1];
      if (y >= r0 && y <= r0 + 1 && x >= S_.FX0 && x <= S_.FX1) {
        const t = (x + 0.5 - S_.FX0) / (S_.FX1 + 1 - S_.FX0);           // 0 at the west end, 1 at the east end
        const west = k % 2 === 1, hw = west ? S_.L[k] : S_.L[k - 1], he = west ? S_.L[k - 1] : S_.L[k];
        return hw + (he - hw) * t;
      }
    }
    return null;
  }
  const cliffTop = (x, y) => 12.3 + 0.9 * Math.sin(x * 0.55 + 1.3) * Math.cos(y * 0.43) + 0.9 * hsh(x, y, 7);
  // The terraces (POLISH17): [first row, height] from the Yard northward; a column's band edges are nudged a row either way
  // so the rock does not read as a ruler. W is west of the Stair, E the lower shoulder and headland east of it.
  const TERR = { W: [[39, 2.4], [33, 4.8], [27, 7.2], [20, 9.6], [-99, 12.0]], E: [[36, 1.5], [30, 3.4], [24, 5.4], [17, 7.4], [-99, 9.2]] };
  function terrK(tab, x, y) { const j = hsh(x >> 1, 7, 61), yy = y + (j < 0.3 ? 1 : j > 0.7 ? -1 : 0); for (let k = 0; k < tab.length; k++) if (yy >= tab[k][0]) return k; return tab.length - 1; }
  const terrTop = (tab, x, y) => { const k = terrK(tab, x, y); return tab[k][1] + 0.35 * hsh(x, y, 17) + (k === tab.length - 1 ? 0.5 * hsh(x, y, 18) : 0); };
  // [table, first column, last column, terrace]: the houses stacked on the cliff
  const CLIFF_HOUSES = [
    [TERR.W, 3, 6, 0], [TERR.W, 10, 13, 0], [TERR.W, 17, 20, 0], [TERR.W, 22, 24, 0],
    [TERR.W, 2, 5, 1], [TERR.W, 8, 11, 1], [TERR.W, 14, 17, 1], [TERR.W, 20, 24, 1],
    [TERR.W, 4, 7, 2], [TERR.W, 11, 14, 2], [TERR.W, 18, 22, 2],
    [TERR.W, 3, 6, 3], [TERR.W, 9, 13, 3], [TERR.W, 17, 20, 3],
    [TERR.E, 52, 55, 0], [TERR.E, 51, 54, 1], [TERR.E, 56, 58, 1], [TERR.E, 52, 56, 2], [TERR.E, 51, 54, 3], [TERR.E, 56, 58, 3],
    [TERR.E, 60, 63, 1], [TERR.E, 61, 65, 2], [TERR.E, 59, 62, 3],
  ];
  function buildHarbour() {
    const W = 96, H = 68, S_ = STAIR, YL = S_.L[0];
    const m = new GameMap(HARBOUR, 'Port Cantabile', W, H, { outdoor: true, floor: 'p17c_flags', floorTextures: FLOORS, fogDist: 52, fogColor: [150, 158, 156], ambient: 0.2, music: 'town', danger: 0, spawn: { x: 79.5, y: 53.4, dir: Math.PI } });
    m.floorCells.fill(F.water);
    m.ensureLvls(); m.ensureVerts();
    const fill = (x0, y0, x1, y1, idx, lv) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { m.setFloor(x, y, idx); if (lv != null) m.setLvl(x, y, lv); } };
    const cliff = (x, y, lv, top, cap) => m.block(x, y, TEXN.cliff, top, { capTex: cap || 'p17c_turf' });
    // ---- the Yard (the Lantern Yard is the lower town), the Long Mole, the Mole-head and the Mole steps
    fill(4, 44, 52, 57, F.flag, YL);
    fill(20, 58, 22, 58, F.shal, 0.2);                                                       // the Yard steps, going down to the water
    fill(53, 50, 81, 52, F.mole, YL); fill(72, 47, 81, 55, F.mole, YL); fill(54, 53, 61, 54, F.mole, YL);
    m.setSide(4, 44, 81, 58, TEXN.quay);
    // ---- the Stair: flights, landings, the foot, the top yard
    for (let k = 1; k <= 6; k++) {
      const r0 = S_.ROWS[k - 1], west = k % 2 === 1;
      if (west) m.ramp(S_.FX0, r0, S_.FX1, r0 + 1, S_.L[k], S_.L[k - 1], 'x'); else m.ramp(S_.FX0, r0, S_.FX1, r0 + 1, S_.L[k - 1], S_.L[k], 'x');
      for (let x = S_.FX0; x <= S_.FX1; x++) { m.setFloor(x, r0, F.sthi); m.setFloor(x, r0 + 1, F.stlo); }
      const lr = S_.LAND[k]; fill(west ? S_.WX0 : S_.EX0, lr[0], west ? S_.WX1 : S_.EX1, lr[1], F.flag, S_.L[k]);
    }
    fill(S_.FOOT.x0, S_.FOOT.y0, S_.FOOT.x1, S_.FOOT.y1, F.flag, YL);
    fill(S_.TOP.x0, S_.TOP.y0, S_.TOP.x1, S_.TOP.y1, F.flag, S_.L[6]);
    m.setSide(S_.WX0, S_.TOP.y0, S_.EX1, S_.FOOT.y1, TEXN.quay);
    // ---- the cliff (POLISH17): the whole north side of the harbour is the cliff the town is built on. West of the Stair the
    // rock climbs in terraces to the summit; east of it a lower shoulder runs out to the headland, falling away to the sea.
    // Houses stand on the terraces, stacked one row above another, with the Stair cut up the middle and the counting-house
    // at the top against the sky. Only cells that were already rock or open water change: nobody can walk on any of it.
    const rowMax = (y) => { let v = YL; for (let yy = y - 1; yy <= y + 1; yy++) for (let x = S_.WX0; x <= S_.EX1; x++) { const l = stairLevel(x, yy); if (l != null && l > v) v = l; } return v; };
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      let top = null;
      if (x <= 25 && y <= 43) top = terrTop(TERR.W, x, y);
      else if (x >= 26 && x <= 48 && y <= 13) top = 11.5 + 0.3 * hsh(x, y, 3);                          // behind the counting-house: the cliff-top, low
      else if (x >= 50 && y <= 40) {                                                                        // the shoulder east of the Stair, and the headland
        top = terrTop(TERR.E, x, y);
        if (x > 66) top = Math.max(1.4, top * Math.max(0.34, 1 - (x - 66) * 0.05) + 0.6 * hsh(x, y, 9));
      }
      if (top != null) cliff(x, y, YL, top);
    }
    // west wall of the Stair (x=26): a parapet of rock a little above every flight and landing beside it
    for (let y = 14; y <= 43; y++) cliff(26, y, YL, Math.max(terrTop(TERR.W, 25, y), rowMax(y) + 1.0));
    for (let x = 26; x <= 48; x++) cliff(x, 13, YL, 11.65 + 0.2 * hsh(x, 13, 3));
    // the houses on the terraces: a lime-washed front with its windows, set back a step from the rock edge, and the slate
    // roof rising behind it
    for (const [tab, x0, x1, k] of CLIFF_HOUSES) {
      const T = tab[k][1];
      for (let x = x0; x <= x1; x++) {
        let f = 43; while (f > 1 && terrK(tab, x, f) !== k) f--;                                            // the south face of terrace k in this column
        f -= 1;
        if (f < 3) continue;
        m.block(x, f, TEXN.front[(x + k) % 3], T + 1.7, { capTex: TEXN.slate });
        m.block(x, f - 1, TEXN.slate, T + 2.2 + (x === x0 || x === x1 ? -0.2 : 0), { capTex: TEXN.slate });
      }
    }
    // the bands between flights and landings: low rails seen from above, retaining walls seen from below
    const bandTop = new Map();
    for (const y of [...S_.BANDS, 43]) for (let x = S_.WX0; x <= S_.EX1; x++) {
      if (stairLevel(x, y) != null) continue;
      const a = stairLevel(x, y - 1), b = y === 43 ? YL : stairLevel(x, y + 1);
      if (a == null || b == null) continue;
      const lo = Math.min(a, b), hi = Math.max(a, b);
      // POLISH17: the wall wears its rock below the upper flight and a pale coping parapet above it (the cell's level is the
      // upper flight's, so the riser below it takes the side texture), and the parapets draw the zigzag up the cliff
      m.block(x, y, TEXN.para, hi + 0.45, { capTex: 'p17c_mole' }); m.setLvl(x, y, hi); m.setSide(x, y, x, y, TEXN.retain[(x * 7 + y) % 3]); bandTop.set(x + ',' + y, hi);
    }
    // the east rail (x=49): a rail of stanchions and cables, below eye height so the harbour stays open
    for (let y = 14; y <= 43; y++) {
      const l = stairLevel(48, y), hi = l != null ? l : (bandTop.get('48,' + y) != null ? bandTop.get('48,' + y) : S_.L[6]);
      m.block(49, y, TEXN.rail, hi + 0.45, { capTex: 'p17c_mole' }); m.setLvl(49, y, YL);
    }
    // the zigzag: a small gold lamp on the top of each retaining wall, alternating west and east, so that the six flights read
    // as a thread of lights up the cliff from the Yard and the harbour (the lamps stand on the wall's top: yOff lifts them)
    const zig = [[43, 38], [40, 33], [37, 42], [34, 33], [31, 42], [28, 33]];
    for (const [zy, zx] of zig) {
      const lo = zy === 43 ? YL : Math.min(stairLevel(zx, zy - 1), stairLevel(zx, zy + 1)), hi = zy === 43 ? stairLevel(zx, 42) : Math.max(stairLevel(zx, zy - 1), stairLevel(zx, zy + 1));
      m.add({ kind: 'deco', sprite: 'p17c_lamppost', x: zx + 0.5, y: zy + 0.5, solid: false, radius: 0.1, scale: 1.7, yOff: -0.45, glow: 1.0, lightCol: GOLD_LIGHT, label: TX.harbour.post, nopick: true, _lamp: 'p17c_lamppost', _lampG: 1.0, _lampZ: hi });
    }
    for (let x = 27; x < S_.EX0; x++) if (!m.get(x, 25)) m.block(x, 25, TEXN.retain[x % 3], S_.L[6] + 0.45, { capTex: 'p17c_mole' });
    // ---- the sea's edge: breakers, rock stacks, and the Cay low in the south-east
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {                                    // the sea's edge: rock, low in the south and east so the haze takes it
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) m.block(x, y, TEXN.cliff, (x === 0 || y === 0) ? 3.6 + 2 * hsh(x, y, 19) : 1.0 + 1.2 * hsh(x, y, 19), { capTex: 'p17c_turf' });
    }
    for (const [x, y, h] of [[63, 58, 3.4], [64, 58, 2.6], [63, 59, 2.2], [72, 62, 4.6], [73, 62, 3.4], [72, 63, 3.0], [55, 63, 2.4], [84, 57, 3.0], [85, 57, 2.4], [38, 61, 2.2], [6, 62, 2.8], [7, 62, 2.0], [88, 60, 2.8], [89, 60, 3.6], [90, 60, 2.6], [89, 61, 3.2], [90, 61, 2.2], [88, 62, 2.0], [91, 59, 2.2]]) m.block(x, y, TEXN.cliff, h, { capTex: 'p17c_turf' });
    // ---- the Yard: four of Hesper's houses, the Harbour office
    for (const hx of HOUSE_X) {
      for (let y = 45; y <= 49; y++) for (let x = hx; x <= hx + 4; x++) m.set(x, y, { tex: plasterAt(x, y) });
      for (let y = 46; y <= 48; y++) for (let x = hx + 1; x <= hx + 3; x++) m.block(x, y, TEXN.slate, 1.55, { capTex: TEXN.slate });
      m.set(hx + 2, 49, DOOR({ tex: TEXN.door, locked: '__never', lockMsg: TX.harbour.shut, label: TX.harbour.boots }));
    }
    for (let y = 45; y <= 50; y++) for (let x = 36; x <= 43; x++) m.set(x, y, { tex: plasterAt(x + 2, y) });
    for (let y = 46; y <= 49; y++) for (let x = 37; x <= 42; x++) m.block(x, y, TEXN.slate, 1.6, { capTex: TEXN.slate });
    m.set(39, 50, DOOR({ tex: TEXN.door, portal: { map: OFFICE, x: 7.5, y: 8.4, dir: -Math.PI / 2 }, label: TX.harbour.sign }));
    // ---- the shopfronts: a lime-washed front on each landing, a door in it
    for (let k = 1; k <= 5; k++) {
      const [dx, dy] = S_.SHOPS[k], west = k % 2 === 1, lr = S_.LAND[k];
      if (west) { for (let y = dy - 1; y <= dy + 1; y++) m.set(27, y, { tex: plasterAt(27, y) }); }
      else { for (let x = dx - 1; x <= dx + 1; x++) m.set(x, lr[0], { tex: plasterAt(x, lr[0]) }); }
      const lab = [null, TX.landing.door1, TX.landing.door2, TX.landing.door3, TX.landing.door4, TX.landing.door5][k];
      if (k === 3) m.set(dx, dy, DOOR({ tex: TEXN.door, portal: { map: CHANDLER, x: 6.5, y: 7.4, dir: -Math.PI / 2 }, label: TX.landing.door3 }));
      else if (k === 4) m.set(dx, dy, DOOR({ tex: TEXN.door, portal: { map: WIDOW, x: 4.5, y: 6.4, dir: -Math.PI / 2 }, label: TX.landing.door4 }));
      else m.set(dx, dy, DOOR({ tex: k === 2 ? TEXN.shut : TEXN.door, locked: '__never', lockMsg: lab, label: lab }));
    }
    // ---- the counting-house at the top: square ashlar, a slate roof, iron shutters, the sun-disc over a shut door
    for (let y = 8; y <= 16; y++) for (let x = 34; x <= 44; x++) m.block(x, y, TEXN.ash, S_.L[6] + 3.6, { capTex: TEXN.slate });
    for (let y = 9; y <= 15; y++) for (let x = 35; x <= 43; x++) m.block(x, y, TEXN.slate, S_.L[6] + 4.8 - Math.abs(x - 39) * 0.22, { capTex: TEXN.slate });
    for (const x of [36, 37, 41, 42]) m.block(x, 16, TEXN.shut, S_.L[6] + 3.6, { capTex: TEXN.slate });
    m.set(39, 16, DOOR({ tex: TEXN.door, locked: '__never', lockMsg: TX.top.shut, label: TX.top.shut }));
    for (let y = 8; y <= 16; y++) for (let x = 34; x <= 44; x++) m.setLvl(x, y, S_.L[6]);
    // ---- the lamps of the Stair, the flags of the landings (props)
    const lamp = (x, y, sc) => J(m, 'p17c_lamppost', x, y, { solid: false, radius: 0.12, scale: sc || 0.95, glow: 0.8, lightCol: GOLD_LIGHT, label: TX.harbour.post, _lamp: 'p17c_lamppost', _lampG: 0.8 });
    for (let k = 1; k <= 6; k++) {
      const lr = S_.LAND[k], west = k % 2 === 1, cx = west ? 28.4 : 46.6;
      const ly = lr[0] + 0.8;
      J(m, 'p17c_lantern', cx + (west ? -0.6 : 0.6), ly + 1.2, { solid: false, radius: 0.1, scale: 0.7, yOff: -0.48, glow: 0.8, lightCol: GOLD_LIGHT, label: TX.harbour.lamp, _lamp: 'p17c_lantern', _lampG: 0.8 });
      lamp(west ? 29.6 : 47.4, lr[1] - 0.6, 0.85);
    }
    for (const [k, xs] of [[1, [36.5]], [2, [38.5]], [3, [36.5]], [4, [39.5]], [5, [36.5]], [6, [39.5]]]) {
      const r0 = S_.ROWS[k - 1];
      for (const x of xs) lamp(x, r0 + 0.14, 0.78);
    }
    // landing furniture: washing lines, a bench, nets, floats
    J(m, 'p17c_wash', 29.0, 40.4, { solid: false, scale: 0.8, label: TX.harbour.wash });
    J(m, 'p17c_wash', 46.6, 37.2, { solid: false, scale: 0.8, label: TX.harbour.wash });
    J(m, 'p17c_net', 29.0, 34.2, { solid: false, scale: 0.9, label: TX.harbour.net });
    J(m, 'p17c_wash', 46.4, 31.8, { solid: false, scale: 0.8, label: TX.harbour.wash });
    J(m, 'p17c_net', 28.8, 28.6, { solid: false, scale: 0.95, label: TX.harbour.net });
    J(m, 'p17c_bench', 29.3, 27.4, { solid: false, scale: 0.8, label: TX.harbour.bench, use: 'p17c_bench' });
    J(m, 'p_crate', 47.4, 38.6, { radius: 0.3, scale: 0.55 }); J(m, 'p_barrel', 46.2, 31.2, { radius: 0.3, scale: 0.6 });
    J(m, 'p17c_coil', 28.0, 38.6, { solid: false, scale: 0.5, label: TX.harbour.coil });
    // the fourth flight's rail, mended with a spar and a lantern (aftermath, seen by the tenth)
    J(m, 'p17c_lantern', 39.5, 31.4, { solid: false, radius: 0.1, scale: 0.7, yOff: -0.3, glow: 0.8, lightCol: GOLD_LIGHT, label: TX.harbour.spar, _lamp: 'p17c_lantern', _lampG: 0.8, _lampLow: true });
    // the top yard: cistern, flags, lamps, a view
    J(m, 'p17c_cistern', 29.2, 18.4, { radius: 0.5, scale: 1.1, label: TX.harbour.cistern });
    J(m, 'p17c_sundisc', 39.5, 16.9, { solid: false, scale: 0.9, yOff: -0.5, glow: 0.4, label: TX.top.sun });
    for (const [x, y] of [[33.5, 18.5], [45.5, 18.5], [39.5, 22.5]]) lamp(x, y, 1.0);
    J(m, 'p17c_bench', 46.6, 14.8, { solid: false, scale: 0.8, label: TX.harbour.view });
    // ---- the Yard: houses' lamps, coils, nets, barrels, gulls, bollards, the clerk's trestle desk, moored boats
    for (const x of [8.5, 15.5, 22.5, 29.5]) lamp(x, 50.6, 0.9);
    for (const [x, y] of [[34.4, 51.4], [44.8, 44.6], [50.4, 48.0]]) lamp(x, y, 0.95);
    J(m, 'p17c_net', 11.0, 54.4, { solid: false, scale: 1.0, label: TX.harbour.net }); J(m, 'p17c_wash', 24.0, 53.6, { solid: false, scale: 1.0, label: TX.harbour.wash });
    J(m, 'p17c_coil', 33.2, 55.0, { solid: false, scale: 0.6, label: TX.harbour.coil }); J(m, 'p17c_coil', 49.8, 55.6, { solid: false, scale: 0.55, label: TX.harbour.coil });
    for (const [x, y] of [[8.0, 56.2], [27.4, 56.6], [43.4, 56.4], [58.0, 53.7], [70.0, 53.1], [66.0, 49.4]]) J(m, 'p12r_post', x, y, { solid: true, radius: 0.12, scale: 0.55 });
    for (const [x, y] of [[17.5, 55.4], [38.0, 53.8], [26.4, 57.0]]) { J(m, 'p_barrel', x, y, { radius: 0.3, scale: 0.6 }); }
    J(m, 'p_crate', 36.0, 54.2, { radius: 0.3, scale: 0.55, label: TX.harbour.coil }); J(m, 'p_crate', 51.0, 52.0, { radius: 0.3, scale: 0.55 });
    J(m, 'p17c_gull', 8.0, 55.8, { solid: false, scale: 0.28, label: TX.harbour.gull }); J(m, 'p17c_gull', 43.6, 55.9, { solid: false, scale: 0.28, label: TX.harbour.gull }); J(m, 'p17c_gull', 66.0, 50.5, { solid: false, scale: 0.28, label: TX.harbour.gull });
    J(m, 'table', 46.2, 53.0, { radius: 0.5, scale: 0.7 }); J(m, 'p17c_ring', 56.5, 52.8, { solid: false, scale: 0.3 });
    J(m, 'sign', 40.8, 51.4, { solid: false, scale: 0.7, label: TX.harbour.sign });
    // moored boats with carillon bars at the shroud-head (they hang slack at the slack: see swing())
    const boats = [];
    for (const [x, y, s, v] of [[14.5, 60.5, 1.9, 1], [29.0, 61.5, 2.0, 2], [44.0, 60.6, 1.9, 1], [60.5, 56.4, 2.0, 2], [67.0, 55.6, 2.1, 1], [58.0, 46.6, 1.9, 2], [68.0, 46.8, 2.0, 1], [52.0, 63.0, 2.0, 2], [85.0, 52.0, 1.8, 1], [63.5, 48.75, 2.1, 2], [69.5, 53.75, 2.1, 1]]) {   // POLISH17: bigger, and two lying along the Mole
      const e = J(m, 'p17c_boat' + v, x, y, { solid: false, scale: s, yOff: -0.02, label: TX.harbour.boat, use: 'p17c_listen', p17cBoat: true, _ph: x * 0.37 + y });
      boats.push(e);
    }
    // ---- the Mole-head: the derrick, the Mole-bell, the mast-tower, and the Kestrel on her mooring
    J(m, 'p17c_derrick', 74.4, 47.8, { radius: 0.4, scale: 3.0, label: TX.harbour.derrick });
    J(m, 'p17c_molebell', 74.4, 51.0, { radius: 0.4, scale: 1.7, use: 'p17c_bellrope', label: TX.harbour.bell, glow: 0.2 });
    J(m, 'p17c_mast', 80.2, 48.6, { radius: 0.5, scale: 9.0, use: 'p17c_mast', label: TX.harbour.mast });
    J(m, 'kestrel', 79.0, 49.2, { solid: false, scale: 3.4, yOff: -7.2, label: TX.harbour.mast, nopick: true, _p17cKestrel: true });
    J(m, 'ladder', 79.75, 49.25, { solid: false, scale: 3.4, use: 'p17c_mast', label: TX.harbour.rungs });   // POLISH17: the rungs to the height of a house, not a step-ladder
    lamp(77.0, 53.2, 0.95); lamp(72.8, 54.2, 0.9); lamp(56.6, 53.4, 0.9); lamp(61.0, 50.4, 0.9); lamp(68.0, 50.4, 0.9);
    J(m, 'p17c_coil', 76.8, 54.4, { solid: false, scale: 0.6, label: TX.harbour.coil });
    // ---- the crate off the Yard steps (Article the Sixteenth)
    J(m, 'p17c_floatcrate', 21.4, 59.6, { solid: false, scale: 0.55, use: 'p17c_crate', label: TX.harbour.crate, radius: 0.5, _crate: true });
    // ---- people
    NPCAT(m, 'p17c_mags', 'mags', 79.2, 50.3, Math.PI / 2);
    NPCAT(m, 'p17c_oona', 'p17c_oona', 75.8, 52.2, Math.PI);
    NPCAT(m, 'p17c_bessa', 'p17c_bessa', 57.2, 52.4, 0);
    NPCAT(m, 'p17c_quain', 'p17c_quain', 59.4, 54.1, Math.PI / 2);
    NPCAT(m, 'p17c_teel', 'p17c_teel', 49.6, 54.2, Math.PI);
    NPCAT(m, 'p17c_dunmore', 'p17c_dunmore', 46.0, 54.3, Math.PI);
    NPCAT(m, 'p17c_hesper', 'p17c_hesper', 13.8, 51.4, 0);
    NPCAT(m, 'p17c_hand', 'p17c_hand', 31.0, 53.0, 0);
    NPCAT(m, 'p17c_wife', 'p17c_wife', 29.0, 27.6, 0);
    m.baseCount = m.entities.length;
    m.p17cBoats = boats;
    return m;
  }

  // Interiors are small rooms: walls of the house texture, a wooden floor, a door on the south wall.
  function room(id, name, w, h, music, tex, floor) {
    const m = new GameMap(id, name, w, h, { outdoor: false, floor: floor || 't_wood', ceil: 't_wood', fogDist: 12, fogColor: [14, 12, 10], ambient: 0.5, music: music || 'inside', spawn: { x: w / 2, y: h - 1.6, dir: -Math.PI / 2 } });   // a plank ceiling (POLISH17), not a black void
    m.border(tex || 't_house');
    return m;
  }
  function buildOffice() {
    const m = room(OFFICE, 'The Harbour office', 14, 10, 'inside', 't_wood');
    m.set(7, 9, DOOR({ portal: { map: HARBOUR, x: 39.5, y: 51.7, dir: Math.PI / 2 }, label: TX.office.out }));
    m.spawn = { x: 7.5, y: 8.2, dir: -Math.PI / 2 };
    J(m, 'table', 7.5, 3.2, { radius: 0.5, scale: 0.9, label: TX.office.box });
    J(m, 'p17c_board', 3.4, 1.8, { solid: false, scale: 1.35, use: 'p17c_board', label: TX.office.boardLabel, glow: 0.3 });
    J(m, 'p17c_articles', 10.6, 1.8, { solid: false, scale: 1.35, use: 'p17c_articles', label: TX.office.articlesLabel, glow: 0.3 });
    J(m, 'shelf', 12.0, 5.4, { radius: 0.3, scale: 0.9, label: TX.office.gaffs }); J(m, 'shelf', 1.8, 6.0, { radius: 0.3, scale: 0.9, label: TX.office.gaffs });
    J(m, 'lamp', 5.2, 2.6, { radius: 0.15, scale: 0.8, glow: 0.8, lightCol: GOLD_LIGHT }); J(m, 'lamp', 9.6, 5.2, { radius: 0.15, scale: 0.8, glow: 0.8, lightCol: GOLD_LIGHT });
    J(m, 'p_barrel', 2.4, 3.4, { radius: 0.3, scale: 0.6 }); J(m, 'p_crate', 11.6, 3.2, { radius: 0.3, scale: 0.55 });
    // POLISH17: an office that does business. Ledger-shelves down both walls, the day-book open on a lectern, the stamp and
    // the ledger on the desk, a chart of the harbour and the reef pinned up, the pine box, a bench for captains who wait, and
    // high on the east wall the shelf where salvaged vox-bottles are held for the Harbour, sealed
    J(m, 'shelf', 1.3, 3.0, { radius: 0.3, scale: 1.0, label: TX.office.gaffs }); J(m, 'shelf', 12.7, 3.0, { radius: 0.3, scale: 1.0, label: TX.office.gaffs });
    J(m, 'p9p_lectern', 4.4, 3.6, { radius: 0.25, scale: 0.72 });
    J(m, 'p9p_regbook', 7.0, 3.55, { solid: false, scale: 0.16, yOff: -0.47, nopick: true }); J(m, 'p17c_stamp', 8.3, 3.5, { solid: false, scale: 0.16, yOff: -0.47, nopick: true });
    J(m, 'p17c_chart', 7.5, 0.75, { solid: false, scale: 1.25, yOff: -0.42, nopick: true, glow: 0.25 });
    J(m, 'chest', 9.6, 2.2, { radius: 0.3, scale: 0.5, label: TX.office.box }); J(m, 'chair', 6.3, 2.0, { radius: 0.25, scale: 0.75 });
    J(m, 'p17c_voxshelf', 12.75, 6.9, { solid: false, scale: 0.95, yOff: -0.55, label: TX.office.vox, glow: 0.2 });
    J(m, 'p17c_bench', 2.6, 8.3, { solid: false, scale: 0.75 }); J(m, 'p17c_coil', 11.4, 8.3, { solid: false, scale: 0.55, label: TX.harbour.coil }); J(m, 'crates', 12.4, 8.2, { radius: 0.35, scale: 0.75 });
    J(m, 'p9p_table', 7.0, 6.0, { radius: 0.5, scale: 0.75 });   // a table in the middle, the day's papers on it
    J(m, 'lamp', 7.0, 4.8, { radius: 0.15, scale: 0.8, glow: 0.8, lightCol: GOLD_LIGHT }); J(m, 'p_barrel', 1.6, 8.2, { radius: 0.3, scale: 0.6 });
    NPCAT(m, 'p17c_teague', 'p17c_teague', 7.5, 2.2, Math.PI / 2);
    m.baseCount = m.entities.length; return m;
  }
  function buildChandler() {
    const m = room(CHANDLER, 'The chandler\'s, third landing', 12, 9, 'inside', 't_wood');
    m.set(6, 8, DOOR({ portal: { map: HARBOUR, x: 28.6, y: 35.5, dir: 0 }, label: TX.chandler.out }));
    m.spawn = { x: 6.5, y: 7.2, dir: -Math.PI / 2 };
    J(m, 'p17c_helm', 9.6, 2.0, { radius: 0.3, scale: 0.8, label: TX.chandler.helm, glow: 0.2 });
    J(m, 'shelf', 2.0, 3.0, { radius: 0.3, scale: 0.9, label: TX.chandler.shelf }); J(m, 'shelf', 4.2, 1.7, { radius: 0.3, scale: 0.9, label: TX.chandler.shelf });
    J(m, 'table', 6.0, 3.6, { radius: 0.5, scale: 0.9 }); J(m, 'p17c_coil', 2.4, 5.8, { solid: false, scale: 0.7 }); J(m, 'p17c_coil', 9.6, 5.4, { solid: false, scale: 0.7 });
    J(m, 'lamp', 4.4, 4.6, { radius: 0.15, scale: 0.8, glow: 0.8, lightCol: GOLD_LIGHT }); J(m, 'p_barrel', 10.0, 4.2, { radius: 0.3, scale: 0.6 });
    NPCAT(m, 'p17c_sloe', 'p17c_sloe', 6.0, 2.4, Math.PI / 2);
    m.baseCount = m.entities.length; return m;
  }
  function buildWidow() {
    const m = room(WIDOW, 'Marrin Tace\'s room, fourth landing', 10, 8, 'cloister', 't_wood');
    m.set(4, 7, DOOR({ portal: { map: HARBOUR, x: 47.5, y: 30.7, dir: Math.PI / 2 }, label: TX.widow.out }));
    m.spawn = { x: 4.5, y: 6.2, dir: -Math.PI / 2 };
    J(m, 'shelf', 7.6, 1.5, { radius: 0.3, scale: 0.9, label: TX.widow.shelf });
    J(m, 'p17c_bottle', 7.6, 2.2, { solid: false, scale: 0.34, yOff: -0.34, use: 'p17c_shelf', label: TX.widow.shelf, glow: 0.3, _bottle: true });
    J(m, 'table', 4.0, 3.6, { radius: 0.5, scale: 0.8, label: TX.widow.table }); J(m, 'hearth', 1.6, 3.0, { radius: 0.4, scale: 0.8, glow: 0.6, lightCol: [64, 36, 10], label: TX.widow.hearth });
    J(m, 'lamp', 6.2, 4.8, { radius: 0.15, scale: 0.8, glow: 0.8, lightCol: GOLD_LIGHT }); J(m, 'bed', 8.0, 5.4, { radius: 0.4, scale: 0.8 });
    J(m, 'sign', 3.0, 1.2, { solid: false, scale: 0.7, label: TX.widow.window });
    NPCAT(m, 'p17c_tace', 'p17c_tace', 4.6, 2.4, Math.PI / 2);
    m.baseCount = m.entities.length; return m;
  }
  const CAY_GRAVES = [[22.5, 7.5], [24.5, 7.2], [26.5, 7.6], [28.5, 7.3], [30.5, 7.7], [32.4, 8.0], [21.5, 9.6], [23.6, 9.4], [25.6, 9.8], [27.6, 9.5], [29.6, 9.9], [31.6, 10.2], [22.4, 11.6], [24.4, 11.8], [26.4, 11.5], [28.4, 11.9], [30.4, 12.2], [32.2, 12.4], [21.6, 13.6], [23.6, 13.8], [25.6, 13.5], [27.6, 13.9], [29.6, 14.2], [31.6, 14.4]];
  const CAY_BARE = [[26.0, 8.6], [30.0, 11.0], [24.0, 12.8]];
  function buildCay() {
    const W = 44, H = 30;
    const m = new GameMap(CAY, 'Driftwood Cay', W, H, { outdoor: true, floor: 'p17c_turf', floorTextures: ['p17c_turf', 'p17c_flags', 't_water', 't_shallows', 'p17c_plank', 'p17c_turf2'], fogDist: 30, fogColor: [124, 138, 144], music: 'wild', danger: 0, spawn: { x: 6.5, y: 14.5, dir: 0 } });
    m.floorCells.fill(2); m.ensureLvls(); m.ensureVerts();
    for (let y = 5; y <= 24; y++) for (let x = 6; x <= 38; x++) { const e = (x - 22) / 17, f = (y - 14.5) / 10; if (e * e + f * f < 1) { m.setFloor(x, y, (x * 7 + y * 3) % 9 === 0 ? 5 : 0); m.setLvl(x, y, 0.5); } }
    for (let y = 13; y <= 15; y++) for (let x = 2; x <= 7; x++) { m.setFloor(x, y, 4); m.setLvl(x, y, 0.45); }
    m.hill(27, 10.5, 8.5, 5.0, 2.0, { steep: 0.55, base: 0.5 });
    for (let y = 5; y <= 24; y++) for (let x = 6; x <= 38; x++) if (m.floorCells[y * W + x] !== 2 && m.smooth[y * W + x]) m.setFloor(x, y, (x * 5 + y) % 4 === 0 ? 5 : 0);
    m.border('p17c_cliff');
    for (let x = 0; x < W; x++) { m.block(x, 0, TEXN.cliff, 2.4, { capTex: 'p17c_turf' }); m.block(x, H - 1, TEXN.cliff, 2.2, { capTex: 'p17c_turf' }); }
    for (let y = 0; y < H; y++) { m.block(0, y, TEXN.cliff, 2.4, { capTex: 'p17c_turf' }); m.block(W - 1, y, TEXN.cliff, 2.2, { capTex: 'p17c_turf' }); }
    // Hesper's orphan-house: low, square, a lit kitchen window
    for (let y = 16; y <= 20; y++) for (let x = 9; x <= 14; x++) m.set(x, y, { tex: plasterAt(x, y) });
    for (let y = 17; y <= 19; y++) for (let x = 10; x <= 13; x++) m.block(x, y, TEXN.slate, 1.55, { capTex: TEXN.slate });
    m.set(11, 16, DOOR({ tex: TEXN.door, locked: '__never', lockMsg: TX.cay.house, label: TX.cay.house }));
    J(m, 'lamp', 12.4, 15.4, { radius: 0.15, scale: 0.8, glow: 0.8, lightCol: GOLD_LIGHT, label: TX.cay.house });
    J(m, 'p17c_wash', 7.6, 17.8, { solid: false, scale: 0.8, label: TX.cay.house });
    // the burying-ground: a small bell on an iron hook at every grave; some hooks are bare
    for (const [x, y] of CAY_GRAVES) J(m, 'p17c_gravebell', x, y, { solid: false, radius: 0.2, scale: 0.85, label: TX.cay.grave, _grave: true });
    CAY_BARE.forEach(([x, y], i) => J(m, 'p17c_barehook', x, y, { solid: false, radius: 0.25, scale: 0.85, label: TX.cay.bare, use: 'p17c_hook', _hook: i }));
    J(m, 'sign', 20.4, 15.6, { solid: false, scale: 0.7, label: TX.cay.rock }); J(m, 'p17c_boat1', 3.2, 17.6, { solid: false, scale: 1.1, label: TX.cay.jetty, yOff: -0.05 });
    J(m, 'sign', 34.6, 17.8, { solid: false, scale: 0.7, label: TX.cay.harbour }); J(m, 'p_reed1', 8.4, 22.0, { solid: false, scale: 0.55, label: TX.cay.scrub }); J(m, 'p_reed2', 35.0, 22.4, { solid: false, scale: 0.55, label: TX.cay.scrub });
    J(m, 'p17c_gull', 18.0, 12.4, { solid: false, scale: 0.26, label: TX.harbour.gull });
    NPCAT(m, 'p17c_quain2', 'p17c_quain', 5.2, 15.7, 0);
    NPCAT(m, 'p17c_child', 'p17c_child', 16.0, 18.0, 0);
    NPCAT(m, 'p17c_hesper2', 'p17c_hesper', 11.5, 21.4, 0);
    m.baseCount = m.entities.length; return m;
  }

  // ---------------------------------------------------------------- catalogue: items, people, the dialogue menus
  const ITEM_DEFS = {
    p17c_receipt: { name: TX.key.receipt, sprite: 'loot', key: true, desc: TX.key.receiptDesc },
    p17c_valve: { name: TX.key.valve, sprite: 'loot', key: true, desc: TX.key.valveDesc },
    p17c_bottle: { name: TX.key.bottle, sprite: 'loot', key: true, desc: TX.key.bottleDesc },
    p17c_gravebell: { name: TX.key.gravebell, sprite: 'loot', value: 1, desc: TX.key.gravebellDesc },
    p17c_whistle: { name: TX.tace.whistle, sprite: 'loot', key: true, desc: TX.tace.whistleDesc },
  };
  const gold = () => Number(G.player && G.player.gold) || 0;
  const addG = (n) => { try { G.gold(n); } catch (e) { G.player.gold = gold() + n; } };
  const spend = (n) => { G.player.gold = Math.max(0, gold() - n); };
  const has_ = (id) => { try { return G.has(id); } catch (e) { return false; } };
  const xp = (n) => { try { questXp(n); } catch (e) { /* xp is a bonus */ } };
  const sfx = (k) => { try { Audio_.sfx[k](); } catch (e) { /* silent */ } };
  const say = (t, cls, ttl) => { try { msg(t, cls || '', ttl || 5000); } catch (e) { /* no HUD */ } };
  const jour = (t) => { try { journal('side', t); } catch (e) { /* no journal */ } };
  const learn = () => { if (fint('q') < 1) { setf('q', 1); jour(TX.office.journal); } };
  const NOTES_LC = NOTE.map((n) => n);

  // A repeating menu: each choice gives its reply and then shows the menu again, until one ends the talk.
  function menu(build) {
    const wrap = (c) => ({ t: c.t, f: () => {
      const r = c.f ? c.f() : null;
      if (!c.end) {
        DLG.choices = build().map(wrap);
        setTimeout(() => { try { if (G.state === 'dialogue' && DLG.choices) renderDialogue('choice'); } catch (e) { /* closed */ } }, 0);
      }
      return r;
    } });
    return build().map(wrap);
  }
  const bye = (t, r) => ({ t, f: () => r || null, end: true });

  // ---- Kerrow, the Harbour office (Colm Teague dies in the Nancy's hold on 4 Ashfall, Book Two ch. 1)
  function teagueQuest() {
    if (!inMine(G.mapId)) return null;
    const P = TX.teague, first = !(fint('met') & 1);
    setf('met', fint('met') | 1);
    const build = () => {
      const c = [
        { t: P.qSlack, f: () => { learn(); return P.aSlack; } },
        { t: P.qWhere, f: () => P.aWhere },
        { t: P.qArticles, f: () => { setf('reads', fint('reads') + 1); return P.aArticles; } },
        { t: P.qBell, f: () => P.aBell },
      ];
      if (fint('q') < 2) c.push({ t: P.qShort, f: () => P.aShort });
      c.push(bye(P.qBye));
      return c;
    };
    return { text: fint('q') >= 2 ? P.paid : (first ? P.intro : P.normal), choices: menu(build) };
  }

  // ---- Oona Salt, the Harbour-Queen (the reef-pitch puzzle; the bell)
  function payDues() {
    spend(B.DUES); setf('q', 2); sfx('pickup'); G.give('p17c_receipt'); xp(B.XP.dues);
    jour(TX.jour.dues); say(TX.oona.payGold, 'good', 4500);
    return TX.oona.pay;
  }
  function answerReef(i) {
    const O = TX.oona;
    if (i !== T.key) return O.wrong;
    if (T.key !== B.SLACK) return O.rightNotSlack;
    if (gold() < B.DUES) return O.broke;
    return payDues();
  }
  function oonaQuest() {
    if (!inMine(G.mapId)) return null;
    const O = TX.oona, first = !(fint('met') & 2);
    setf('met', fint('met') | 2);
    const build = () => {
      const c = [];
      if (fint('q') < 2) {
        for (let i = 0; i < B.KEYS; i++) c.push({ t: NOTE[i], f: () => answerReef(i) });
        c.push({ t: O.askReef, f: () => O.reefReply });
      }
      c.push({ t: O.qBell, f: () => O.aBell });
      if (fint('btl') === 1) c.push({ t: O.qBottle, f: () => {
        DLG.choices = menu(() => [
          { t: O.qGive, f: () => { setTimeout(() => ringBottle(), 0); return O.aBottle2; }, end: true },
          { t: O.qKeep, f: () => O.aKeep, end: true },
        ]);
        setTimeout(() => { try { if (G.state === 'dialogue' && DLG.choices) renderDialogue('choice'); } catch (e) { /* closed */ } }, 0);
        return O.aBottle1;
      }, end: true });
      c.push(bye(O.none));
      return c;
    };
    let text = fint('q') >= 2 ? O.after : (first ? O.normal : O.again);
    if (fint('btl') === 3) text = O.sold;
    else if (fint('btl') === 2) text = O.done;
    return { text, choices: menu(build) };
  }
  // the bell: the ring, the count, the silence
  function ringBottle() {
    if (fint('btl') !== 1) return;
    showEvent(TX.oona.ringTitle, TX.oona.ring, [{ t: TX.oona.ringGo, f: () => {
      if (fint('btl') !== 1) return;
      G.take('p17c_bottle'); setf('btl', 2); setf('bell', 1);
      strikeBell(true); xp(B.XP.bottle); jour(TX.oona.ringJournal);
      setTimeout(() => { say(TX.oona.ringEnd, '', 9000); }, 1200);
    } }]);
  }

  // ---- Auld Bessa, the last Reef-Reader
  function bessaQuest() {
    if (!inMine(G.mapId)) return null;
    const P = TX.bessa, first = !(fint('met') & 4);
    setf('met', fint('met') | 4);
    const build = () => [
      { t: P.qAsk, f: () => P.aAsk },
      { t: P.qTeach, f: () => { setf('bes', 1); learn(); return P.aTeach; } },
      { t: P.qNow, f: () => TX.reef.note[T.key] },
      { t: P.qSlack, f: () => { learn(); return P.aSlack; } },
      { t: P.qWho, f: () => P.aWho },
      bye(TX.teague.qBye),
    ];
    return { text: first ? P.intro : P.back, choices: menu(build) };
  }
  // ---- Captain Hollis Teel
  function teelQuest() {
    if (!inMine(G.mapId)) return null;
    const P = TX.teel, first = !(fint('met') & 8);
    setf('met', fint('met') | 8);
    const build = () => [
      { t: P.qAsk, f: () => P.aAsk },
      { t: P.qRhyme, f: () => { setf('shan', 1); learn(); return P.aRhyme; } },
      { t: P.qSixteenth, f: () => P.aSixteenth },
      bye(P.qBye),
    ];
    return { text: first ? P.intro : P.normal, choices: menu(build) };
  }
  // ---- Fenwick Sloe, the chandler (the valve, and a shop)
  function sloeQuest() {
    if (!inMine(G.mapId)) return null;
    const P = TX.sloe;
    const build = () => {
      const c = [];
      if (fint('valve') === 0) c.push({ t: TX.sloe.pay, f: () => {
        if (!has_('p17c_receipt')) return P.noReceipt;
        if (gold() < B.VALVE) return P.broke;
        spend(B.VALVE); G.take('p17c_receipt'); G.give('p17c_valve'); setf('valve', 1); sfx('pickup'); xp(B.XP.valve);
        jour(TX.jour.valve); return P.receipt + ' ' + P.bought;
      } });
      c.push(bye(P.bring, P.after));
      return c;
    };
    return { text: fint('valve') === 0 ? P.hello : P.after, choices: menu(build) };
  }
  // ---- Marrin Tace, and the bottle
  function taceQuest() {
    if (!inMine(G.mapId)) return null;
    const P = TX.tace, b = fint('btl');
    if (b === 2) {
      if (fint('rec') === 0) {
        setf('rec', 1); addG(B.TACE_GOLD); G.give('p17c_whistle'); sfx('pickup');
        say(P.reward, 'good', 6000);
        return { text: P.rung };
      }
      return { text: P.rungDone };
    }
    if (b === 3) return { text: P.soldDone };
    if (b === 1) return { text: P.carrying };
    const first = !(fint('met') & 16);
    setf('met', fint('met') | 16);
    const build = () => {
      const c = [
        { t: P.qWhy, f: () => P.aWhy },
        { t: P.qOffice, f: () => P.aOffice },
        { t: P.qWant, f: () => { setf('met', fint('met') | 32); return P.aWant; } },
      ];
      if (fint('met') & 32) c.push({ t: P.qCarry, f: () => {
        setf('btl', 1); G.give('p17c_bottle'); sfx('pickup'); jour(P.carryJournal);
        const e = G.map.entities.find((x) => x._bottle); if (e) e.hidden = true;
        return P.aCarry;
      }, end: true });
      c.push(bye(P.qNot, P.aNot));
      return c;
    };
    return { text: first ? P.intro : TX.widow.shelf, choices: menu(build) };
  }
  // ---- Mr. Dunmore, the Office's receiving clerk
  function dunmoreQuest() {
    if (!inMine(G.mapId)) return null;
    const P = TX.clerk;
    if (fint('btl') === 3) return { text: P.after };
    if (fint('btl') !== 1) return { text: P.none };
    return { text: P.have, choices: menu(() => [
      { t: P.qSell, f: () => {
        if (fint('btl') !== 1) return null;
        G.take('p17c_bottle'); setf('btl', 3); addG(B.CLERK); sfx('pickup'); jour(P.soldJournal);
        return P.sold;
      }, end: true },
      bye(P.qNo, P.no),
    ]) };
  }
  // ---- Marlow Quain, the Cay boat
  function quainQuest() {
    if (!inMine(G.mapId)) return null;
    const P = TX.quain, onCay = G.mapId === CAY;
    if (onCay) return { text: P.onCay, choices: menu(() => [
      { t: P.qBack, f: () => { setTimeout(() => ferry(HARBOUR), 0); return P.goBack; }, end: true },
      bye(P.qStay),
    ]) };
    return { text: P.text, choices: menu(() => [
      { t: P.qGo, f: () => { setTimeout(() => ferry(CAY), 0); return P.go; }, end: true },
      bye(P.qNot),
    ]) };
  }
  function ferry(to) {
    try {
      if (G.state === 'dialogue') { closeModal(); G.state = 'play'; }
      if (to === CAY) loadMap(CAY, { x: 5.2, y: 14.6, dir: 0 });
      else loadMap(HARBOUR, { x: 59.8, y: 53.0, dir: -Math.PI / 2 });
    } catch (e) { console.warn('cantabile17 ferry failed', e); }
  }
  // ---- Hesper (the Yard and the Cay)
  function hesperQuest() {
    if (!inMine(G.mapId)) return null;
    const P = TX.hesper;
    return { text: P.intro, choices: menu(() => [
      { t: P.qCay, f: () => P.aCay }, { t: P.qOrphans, f: () => P.aOrphans }, bye(P.qBye),
    ]) };
  }
  // ---- Mags (hand-speech, no voice)
  function magsQuest() {
    if (!inMine(G.mapId)) return null;
    const P = TX.mags, first = !(fint('met') & 64);
    setf('met', fint('met') | 64);
    return { text: fint('btl') === 1 ? P.bottle : (first ? P.first : P.again) };
  }

  const topicsFor = (extra) => Object.assign({ 'Vox-bottles': TX.topic.vox, 'The Hush': TX.topic.hush, 'The Church': TX.topic.church, 'The Iron Synod': TX.topic.synod, 'The Drift-Kestrel': TX.topic.kestrel, 'The Cacophony': TX.topic.cacoph }, extra || {});
  const pers = (name, sprite, tx, quest, extra) => Object.assign({ name: tx.name, sprite, portrait: 'townsman', tier: 'low', greet: { polite: tx.polite, normal: tx.normal, blunt: tx.blunt }, topics: topicsFor(), quest }, extra || {});
  const NPC_DEFS = {
    p17c_teague: pers('', 'p17c_teague', TX.teague, teagueQuest),
    p17c_oona: pers('', 'p17c_oona', TX.oona, oonaQuest, { portrait: 'townswoman' }),
    p17c_bessa: pers('', 'p17c_bessa', TX.bessa, bessaQuest, { portrait: 'townswoman' }),
    p17c_teel: pers('', 'p17c_teel', TX.teel, teelQuest),
    p17c_sloe: pers('', 'p17c_sloe', TX.sloe, sloeQuest, {
      shop: [{ item: 'p17c_gravebell', price: B.BELL }, { item: 'tonic' }, { item: 'honey' }], markup: 1.1,
      shopTalk: { hello: TX.sloe.hello, broke: TX.sloe.broke2, thanks: TX.sloe.thanks.slice(), buys: [] } }),
    p17c_tace: pers('', 'p17c_tace', TX.tace, taceQuest, { portrait: 'townswoman' }),
    p17c_dunmore: pers('', 'p17c_dunmore', TX.clerk, dunmoreQuest, { topics: topicsFor({ 'The Catalogue': TX.clerk.polite }) }),
    p17c_hesper: pers('', 'p17c_hesper', TX.hesper, hesperQuest, { portrait: 'townswoman' }),
    p17c_hesper2: pers('', 'p17c_hesper', TX.hesper, hesperQuest, { portrait: 'townswoman' }),
    p17c_quain: pers('', 'p17c_quain', TX.quain, quainQuest),
    p17c_quain2: pers('', 'p17c_quain', TX.quain, quainQuest),
    p17c_mags: pers('', 'mags', TX.mags, magsQuest, { portrait: 'townswoman' }),
    p17c_wife: pers('', 'p17c_wife', TX.wife, null, { portrait: 'townswoman' }),
    p17c_hand: pers('', 'p17c_hand', TX.hand, null),
    p17c_child: pers('', 'p17c_child', TX.child, null, { portrait: 'townswoman' }),
  };
  for (const k of ['p17c_wife', 'p17c_hand', 'p17c_child']) delete NPC_DEFS[k].quest;
  function installCatalog() {
    if (typeof ITEMS !== 'undefined') for (const k in ITEM_DEFS) if (!ITEMS[k]) ITEMS[k] = Object.assign({}, ITEM_DEFS[k]);
    if (typeof NPCS !== 'undefined') for (const k in NPC_DEFS) if (!NPCS[k]) NPCS[k] = NPC_DEFS[k];
  }

  // ---------------------------------------------------------------- things you can use
  function useBoard() { showEvent(TX.office.boardTitle, TX.office.board, [{ t: 'Step back', f: () => { learn(); } }]); return true; }
  function useArticles() { showEvent(TX.office.articlesTitle, TX.office.articles, [{ t: 'Step back', f: () => { setf('reads', fint('reads') + 1); } }]); return true; }
  function useCrate(e) {
    if (fint('salv') === 1) { say(TX.harbour.crateGone, '', 3500); return true; }
    const keep = B.SALVAGE - Math.ceil(B.SALVAGE / 5);
    setf('salv', 1); addG(keep); sfx('pickup'); xp(B.XP.salvage); jour(TX.jour.salvage);
    if (e) e.hidden = true;
    say(TX.harbour.crateLift, 'good', 6000);
    return true;
  }
  function useHook(e) {
    const bit = 1 << (e._hook | 0);
    if (fint('hung') & bit) { say(TX.cay.hangDone, '', 3500); return true; }
    if (!has_('p17c_gravebell')) { say(TX.cay.hangNo, 'warn', 4500); return true; }
    G.take('p17c_gravebell');
    const first = fint('hung') === 0;
    setf('hung', fint('hung') | bit); e.sprite = 'p17c_gravebell'; e.label = TX.cay.hangDone; e.use = null;
    say(TX.cay.hang, 'good', 6500); sfx('pickup'); graveChime(1);
    xp(B.XP.bell); if (first) jour(TX.cay.hangJournal);
    return true;
  }
  function useListen() {
    const w = has_('p17c_whistle') ? TX.tace.whistleUse + ' ' : '';
    say(w + TX.reef.note[T.key], '', 6500); reefCaption(true);
    return true;
  }
  function useMast() {
    if (has_('p17c_bottle')) { say(TX.end.bottle, 'warn', 6500); return true; }
    const done = fint('q') >= 2 && fint('valve') === 1;
    showEvent(TX.end.title, TX.end.climb + (done ? '' : '<br><br>' + TX.end.climbNone), [
      { t: TX.end.goUp, f: () => finishExtra() },
      { t: TX.end.notYet, f: () => {} },
    ]);
    return true;
  }
  function resultText() {
    const E_ = TX.end, bits = [];
    bits.push(fint('q') >= 2 ? E_.resDues : E_.resNoDues);
    bits.push(fint('valve') === 1 ? E_.resValve : E_.resNoValve);
    const b = fint('btl');
    bits.push(b === 2 ? E_.resRung : b === 3 ? E_.resSold : E_.resNone);
    if (fint('hung')) bits.push(E_.resBell);
    if (fint('bes') || fint('shan') || fint('q') >= 2) bits.push(E_.resHeard);
    return bits.join(' ');
  }
  function finishExtra() {
    setf('fin', 1);
    const res = { title: TX.end.resTitle, text: resultText(), done: fint('q') >= 2 && fint('valve') === 1 };
    say(TX.end.up, '', 6000);
    let inX = null; try { inX = EXTRAS17.inExtra(); } catch (e) { inX = null; }
    if (inX === ID) { try { const t = res.text.length > 160 ? res.text.slice(0, 159).replace(/\s+\S*$/, '') + '\u2026' : res.text; EXTRAS17.finish({ title: res.title, text: t, done: res.done }); return res; } catch (e) { console.warn('cantabile17 finish failed', e); } }
    showEvent(res.title, res.text, [{ t: TX.ex.go, f: () => {} }]);
    return res;
  }
  function onUse(e) {
    switch (e.use) {
      case 'p17c_board': return useBoard();
      case 'p17c_articles': return useArticles();
      case 'p17c_mast': return useMast();
      case 'p17c_bellrope': say(TX.harbour.bellRope, '', 5500); return true;
      case 'p17c_crate': return useCrate(e);
      case 'p17c_hook': return useHook(e);
      case 'p17c_shelf': say(TX.widow.shelf, '', 6000); return true;
      case 'p17c_bench': say(TX.harbour.bench, '', 6000); return true;
      case 'p17c_listen': return useListen();
      default: return false;
    }
  }

  // ---------------------------------------------------------------- the reef: the key, the clock, the captions
  function capLine(text, gap) {
    try {
      if (gap && T.clock - (T.capT[text] || -1e9) < gap) return;
      T.capT[text] = T.clock;
      if (typeof ACCESS === 'undefined' || !ACCESS.settings || !ACCESS.settings.cap) return;
      let box = document.getElementById('ac-captions');
      if (!box) { const g = document.getElementById('game'); if (!g) return; box = document.createElement('div'); box.id = 'ac-captions'; box.setAttribute('role', 'log'); box.setAttribute('aria-live', 'polite'); box.setAttribute('aria-label', 'Sound captions'); g.appendChild(box); }
      const d = document.createElement('div'); d.textContent = text; box.appendChild(d);
      while (box.children.length > 4) box.removeChild(box.firstChild);
      setTimeout(() => { if (d.parentNode) d.remove(); }, 3200);
    } catch (e) { /* captions are cosmetic */ }
  }
  const reefCaption = (force) => capLine(TX.reef.cap, force ? 0 : 18);
  const outdoors = () => G.mapId === HARBOUR || G.mapId === CAY;
  function resetRun() {
    T.key = B.START_KEY; T.t = B.START_T; T.clock = 0; T.count = 0; T.mourn = -1; T.walked = 0; T.capT = {}; T.said = {}; T.ending = false; T.swing = 0; T.lampT = 0;
  }
  function setKey(i) { T.key = ((i % B.KEYS) + B.KEYS) % B.KEYS; T.t = 0; }
  function reefTick(dt) {
    T.t += dt;
    let changed = false;
    while (T.t >= B.KEY_SECS) { T.t -= B.KEY_SECS; T.key = (T.key + 1) % B.KEYS; changed = true; }
    if (changed && outdoors()) { say(TX.reef.change[T.key], '', 4200); reefCaption(true); }
    return changed;
  }
  const slackNow = () => T.key === B.SLACK;

  // ---------------------------------------------------------------- audio: surf, the reef's drone, chimes, gulls, the Mole-bell, the Cay's graves
  const AU = { ctx: null, root: null, drone: null, surf: null, nextChime: 3, nextGull: 9, nextGrave: 2, nextHum: 0 };
  const audioOk = () => { try { return typeof Audio_ !== 'undefined' && Audio_.ctx && Audio_.sfxBus && !Audio_.muted; } catch (e) { return false; } };
  function buildAudio() {
    const A = Audio_, ctx = A.ctx;
    AU.ctx = ctx;
    const root = ctx.createGain(); root.gain.value = 0; root.connect(A.sfxBus); AU.root = root;
    // the reef: two sines (the key and its octave) with a slow shimmer
    const dg = ctx.createGain(); dg.gain.value = 0.0; dg.connect(root);
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), o3 = ctx.createOscillator();
    o1.type = 'sine'; o2.type = 'sine'; o3.type = 'triangle';
    o1.frequency.value = B.NOTE_HZ[T.key]; o2.frequency.value = B.NOTE_HZ[T.key] * 2.003; o3.frequency.value = B.NOTE_HZ[T.key] * 0.5;
    const g2 = ctx.createGain(); g2.gain.value = 0.32; const g3 = ctx.createGain(); g3.gain.value = 0.5;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.18; const lg = ctx.createGain(); lg.gain.value = 0.35; lfo.connect(lg); lg.connect(dg.gain);
    o1.connect(dg); o2.connect(g2); g2.connect(dg); o3.connect(g3); g3.connect(dg);
    for (const o of [o1, o2, o3, lfo]) o.start();
    AU.drone = { o: [o1, o2, o3], g: dg };
    // the surf: brown noise, breathing
    const len = ctx.sampleRate * 3, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0, seed = 11; for (let i = 0; i < len; i++) { seed = (seed * 16807) % 2147483647; const w = seed / 2147483647 * 2 - 1; last = (last + 0.05 * w) / 1.05; d[i] = last * 3.4; }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.4;
    const sg = ctx.createGain(); sg.gain.value = 0;
    const sl = ctx.createOscillator(); sl.frequency.value = 0.11; const slg = ctx.createGain(); slg.gain.value = 0.35; sl.connect(slg); slg.connect(sg.gain);
    src.connect(lp); lp.connect(sg); sg.connect(root); src.start(); sl.start();
    AU.surf = { g: sg, lp }; AU.srcs = [o1, o2, o3, lfo, src, sl];
  }
  // off the harbour's maps (or muted) the bed is faded out and its sources stopped: nothing of it runs, and nothing is
  // automated per frame, anywhere else in the game; it is built again on the way back in
  function dropAudio() {
    const root = AU.root, srcs = AU.srcs || [], ctx = AU.ctx; AU.root = null; AU.drone = null; AU.surf = null; AU.srcs = null;
    try {
      const t = ctx.currentTime; root.gain.cancelScheduledValues(t); root.gain.setTargetAtTime(0, t, 0.2);
      for (const o of srcs) o.stop(t + 1.2);
      setTimeout(() => { try { root.disconnect(); } catch (e) { /* gone */ } }, 1400);
    } catch (e) { /* closed context */ }
  }
  function ambience(dt) {
    const inM = inMine(G.mapId);
    if (!audioOk() || !inM) { if (AU.root) dropAudio(); return; }
    if (!AU.root || AU.ctx !== Audio_.ctx) { try { buildAudio(); } catch (e) { AU.root = null; return; } }
    const t = AU.ctx.currentTime, out = outdoors();
    const hush = T.count > 0 ? 0 : 1;                                       // the harbour counts: its own noises stop
    try {
      AU.root.gain.setTargetAtTime(inM ? 1 : 0, t, 0.3);
      AU.drone.g.gain.setTargetAtTime(inM ? (out ? 0.05 : 0.016) * hush : 0, t, 0.5);
      for (const [i, k] of [[0, 1], [1, 2.003], [2, 0.5]]) AU.drone.o[i].frequency.setTargetAtTime(B.NOTE_HZ[T.key] * k, t, 0.9);
      AU.surf.g.gain.setTargetAtTime(inM ? (out ? 0.06 : 0.02) * hush : 0, t, 0.5);
      AU.surf.lp.frequency.setTargetAtTime(out ? 620 : 240, t, 0.5);
    } catch (e) { return; }
    if (!inM || G.state === 'title' || T.count > 0) return;
    T.clockA = (T.clockA || 0) + dt;
    if (G.mapId === HARBOUR) {
      if (T.clockA > AU.nextChime) { AU.nextChime = T.clockA + 2.4 + Math.random() * 5.5; chime(); }
      if (T.clockA > AU.nextGull) { AU.nextGull = T.clockA + 9 + Math.random() * 14; gull(); }
    } else if (G.mapId === CAY) {
      if (T.clockA > AU.nextGrave) { AU.nextGrave = T.clockA + 1.4 + Math.random() * 3.2; graveChime(1); }
      if (T.clockA > AU.nextGull) { AU.nextGull = T.clockA + 12 + Math.random() * 16; gull(); }
    }
  }
  function ping(freq, gain, dur, pan, type) {
    const ctx = AU.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let last = g; o.connect(g);
    if (ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan || 0; g.connect(p); last = p; }
    last.connect(AU.root); o.start(t); o.stop(t + dur + 0.05);
  }
  function chime() {
    if (!audioOk() || !AU.root) return;
    const base = B.NOTE_HZ[T.key], mul = [4, 5, 6, 8, 10][(Math.random() * 5) | 0], pan = (Math.random() * 2 - 1) * 0.8;
    try { ping(base * mul, 0.02, 1.8, pan); ping(base * mul * 2.76, 0.006, 0.9, pan); } catch (e) { return; }
    capLine(TX.reef.capChime, 20);
  }
  function graveChime(n) {
    if (!audioOk() || !AU.root) return;
    try { for (let i = 0; i < (n || 1); i++) { const f = 1500 + Math.random() * 1400; ping(f, 0.02, 2.0, (Math.random() * 2 - 1) * 0.9); ping(f * 2.4, 0.005, 1.0, 0); } } catch (e) { return; }
    capLine(TX.reef.capGrave, 20);
  }
  function gull() {
    if (!audioOk() || !AU.root) return;
    try {
      const ctx = AU.ctx, t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(), bp = ctx.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(900, t); o.frequency.exponentialRampToValueAtTime(1500, t + 0.14); o.frequency.exponentialRampToValueAtTime(820, t + 0.42);
      bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 2.4;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.012, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(bp); bp.connect(g); g.connect(AU.root); o.start(t); o.stop(t + 0.55);
    } catch (e) { /* silent */ }
  }
  // the Mole-bell: a deep bronze note with its partials, one stroke; then the count
  function bellSound() {
    if (!audioOk()) return;
    try {
      if (!AU.root || AU.ctx !== Audio_.ctx) buildAudio();
      const ctx = AU.ctx, t = ctx.currentTime;
      const out = ctx.createGain(); out.gain.value = 1; out.connect(Audio_.sfxBus);
      for (const [f, gn, dur] of [[98, 0.16, 7], [196.8, 0.1, 5], [295, 0.06, 3.6], [392.5, 0.045, 2.6], [521, 0.025, 1.8], [688, 0.012, 1.2]]) {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gn, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
      }
    } catch (e) { /* silent */ }
  }
  function strikeBell(counted) {
    bellSound(); capLine(TX.reef.capBell, 0);
    if (counted !== false) T.count = B.COUNT_SECS;
  }
  // music is ducked while the harbour counts (a wrapper; never touches the shared master or muffle)
  function wireMusic() {
    try {
      const M = Audio_.music;
      if (M && typeof M.request === 'function' && !M.request._p17c) {
        const _req = M.request;
        const w = function (id, vol, rate) { try { if (T.count > 0 && inMine(G.mapId)) return _req.call(this, id, (vol == null ? 1 : vol) * 0.12, rate); } catch (e) { /* default */ } return _req.apply(this, arguments); };
        // pass the inner wrappers' markers through (deep16 keys its own wrapper on request._p16d: hiding it made it wrap again)
        for (const k of Object.keys(_req)) Object.defineProperty(w, k, { configurable: true, enumerable: true, get: () => _req[k], set: (v) => { _req[k] = v; } });
        w._p17c = true; M.request = w;
      }
    } catch (e) { /* audio optional */ }
  }

  // ---------------------------------------------------------------- per-frame
  const MAST = { x: 80.2, y: 48.6 };
  function tick(dt) {
    if (!G || !G.player || !G.map) return;
    const mine = inMine(G.mapId);
    if (mine && G.state === 'play') {
      T.clock += dt;
      reefTick(dt);
      if (T.count > 0) { T.count = Math.max(0, T.count - dt); if (T.count === 0) { try { Audio_.music.request(G.map.music); } catch (e) { /* silent */ } } }
      // the unasked stroke: once, some time after leaving the mast, while on the harbour
      if (G.mapId === HARBOUR && fint('heard') === 0) {
        const c = Engine.cam;
        if (T.mourn < 0 && Math.hypot(c.x - MAST.x, c.y - MAST.y) > 9) T.mourn = B.MOURN_AFTER[0] + Math.random() * (B.MOURN_AFTER[1] - B.MOURN_AFTER[0]);
        else if (T.mourn >= 0) { T.mourn -= dt; if (T.mourn <= 0) { setf('heard', 1); strikeBell(true); say(TX.harbour.mourn, '', 14000); jour(TX.jour.bellHeard); } }
      }
      if (!T.said.dark && G.tod > 0.8 && G.tod < 0.95) { T.said.dark = 1; say(TX.harbour.dusk, 'warn', 6500); }
      animateBoats();
      syncLamps(dt, false);
    }
    ambience(dt);
  }
  // the harbour's lamps (POLISH17): out by day; at dusk the lamplighter starts at the bottom of the Stair and lights it one
  // landing at a time on his way up (the wall-top lamps of the zigzag go in the order of their height); out again at dawn.
  // Checked four times a second, and only the lamps of the harbour map; nothing here is saved.
  const LAMP = { on: 0.715, step: 0.0035, off: 0.26, every: 0.25, low: [16, 11, 4] };
  function lampLit(e, m) {
    const t = G.tod, z = e._lampZ != null ? e._lampZ : (m.groundAt ? m.groundAt(e.x, e.y) : 0);
    return t < LAMP.off || t >= LAMP.on + LAMP.step * Math.min(11.2, z);
  }
  function syncLamps(dt, force) {
    const m = G.map; if (!m || G.mapId !== HARBOUR) return;
    T.lampT = (T.lampT || 0) - (dt || 0); if (!force && T.lampT > 0) return;
    T.lampT = LAMP.every;
    for (const e of m.entities) {
      if (!e._lamp) continue;
      const lit = lampLit(e, m);
      if (e._lampOn === lit && !force) continue;
      e._lampOn = lit;
      e.sprite = lit ? e._lamp : (e._lampLow ? 'p17c_lantern_low' : e._lamp + '_off');
      e.glow = lit ? e._lampG : 0;
      e.lightCol = lit ? GOLD_LIGHT : (e._lampLow ? LAMP.low : null);
    }
  }
  function animateBoats() {
    const m = G.map; if (!m || !m.p17cBoats) return;
    const amp = reduced() ? 0 : (T.key === B.SLACK ? 0 : T.key === 5 ? 0.07 : 0.026);
    for (const e of m.p17cBoats) e.animLift = amp * Math.sin(T.clock * 1.5 + (T.key === 5 ? 0 : e._ph));
  }

  // ---------------------------------------------------------------- state derived from flags (idempotent, run on every load)
  function applyMapState(id) {
    const m = mapOf(id); if (!m) return;
    if (id === HARBOUR) {
      const cr = m.entities.find((e) => e._crate); if (cr) cr.hidden = fint('salv') === 1;
    } else if (id === CAY) {
      m.entities.filter((e) => e._hook != null).forEach((e) => { if (fint('hung') & (1 << e._hook)) { e.sprite = 'p17c_gravebell'; e.label = TX.cay.hangDone; e.use = null; } });
    } else if (id === WIDOW) {
      const b = m.entities.find((e) => e._bottle); if (b) b.hidden = fint('btl') >= 1;
    }
    try { if (typeof Engine !== 'undefined' && Engine.scanRelief && G.map === m) Engine.scanRelief(m); } catch (e) { /* cosmetic */ }
  }
  const SEEN_BIT = { [HARBOUR]: 1, [OFFICE]: 2, [CHANDLER]: 4, [WIDOW]: 8, [CAY]: 16 };
  function arrive() {
    const m = G.map, c = Engine.cam;
    if (m.isBlocked(c.x | 0, c.y | 0) || !isFinite(c.x) || !isFinite(c.y)) { c.x = m.spawn.x; c.y = m.spawn.y; c.dir = m.spawn.dir || 0; try { settleFeet(); } catch (e) { /* ok */ } }
    const bit = SEEN_BIT[G.mapId] | 0, first = (fint('seen') & bit) === 0;
    if (first) setf('seen', fint('seen') | bit);
    const t = { [HARBOUR]: TX.harbour, [OFFICE]: TX.office, [CHANDLER]: TX.chandler, [WIDOW]: TX.widow, [CAY]: TX.cay }[G.mapId];
    if (t && t.arrive) { say(t.arrive, '', 7000); if (first && t.journal) jour(t.journal); }
    syncLamps(0, true);
    if (outdoors()) {
      try { if (typeof WINTER17 !== 'undefined') WINTER17.apply(G.mapId, { snow: 0, fall: 0, breath: true, grade: 0.16 }); } catch (e) { /* the winter look is optional */ }
    }
  }

  // ---------------------------------------------------------------- the arrival cards (js/screens.js)
  function paintCards() {
    if (typeof SCREENS === 'undefined' || !SCREENS.FAMILY || !SCREENS.caches || !SCREENS.caches.area) return;
    const mk = (fn) => { const c = document.createElement('canvas'); c.width = 320; c.height = 200; const x = c.getContext('2d'); fn(x); return c; };
    const sky = (x, a, b) => { const g = x.createLinearGradient(0, 0, 0, 120); g.addColorStop(0, a); g.addColorStop(1, b); x.fillStyle = g; x.fillRect(0, 0, 320, 200); };
    const sea = (x, y0) => { const g = x.createLinearGradient(0, y0, 0, 200); g.addColorStop(0, '#5a7480'); g.addColorStop(1, '#1e3038'); x.fillStyle = g; x.fillRect(0, y0, 320, 200 - y0); for (let i = 0; i < 70; i++) { x.fillStyle = 'rgba(200,225,235,0.14)'; x.fillRect((i * 53) % 320, y0 + 4 + (i * 17) % (200 - y0), 10 + (i % 5) * 6, 1); } };
    const harbour = mk((x) => {
      sky(x, '#a8b8c0', '#e6d8b8'); sea(x, 118);
      // the cliff, a dark mass on the left, cut by the Stair
      x.fillStyle = '#3a3c3e'; x.beginPath(); x.moveTo(0, 200); x.lineTo(0, 10); x.lineTo(60, 6); x.lineTo(150, 26); x.lineTo(176, 120); x.lineTo(150, 124); x.lineTo(96, 140); x.lineTo(60, 200); x.fill();
      x.fillStyle = '#4a4c4e'; x.beginPath(); x.moveTo(16, 200); x.lineTo(30, 20); x.lineTo(70, 18); x.lineTo(120, 38); x.lineTo(140, 130); x.lineTo(70, 200); x.fill();
      // the six flights, a zigzag of small gold lamps
      let px = 120, py = 128; x.strokeStyle = 'rgba(210,200,170,0.55)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(px, py);
      const pts = [[60, 108], [122, 90], [62, 74], [118, 58], [64, 44], [112, 30]]; for (const [qx, qy] of pts) x.lineTo(qx, qy); x.stroke();
      for (const [qx, qy] of [[120, 128], ...pts]) { x.fillStyle = 'rgba(255,210,120,0.28)'; x.beginPath(); x.arc(qx, qy - 2, 7, 0, 7); x.fill(); x.fillStyle = '#ffe2a0'; x.fillRect(qx - 1, qy - 4, 2.4, 3.4); }
      // the Yard, the Mole and the mast-tower with the Kestrel
      x.fillStyle = '#d8d0bc'; for (let i = 0; i < 5; i++) x.fillRect(176 + i * 15, 128 - (i % 2) * 3, 12, 11);
      x.fillStyle = '#4a3c30'; x.fillRect(176, 142, 150, 4); x.fillStyle = '#34363a'; x.fillRect(284, 40, 2.6, 106); for (let y = 46; y < 144; y += 6) x.fillRect(283, y, 5, 1);
      x.fillStyle = '#6a7078'; x.beginPath(); x.ellipse(285, 36, 20, 7, 0, 0, 7); x.fill(); x.fillStyle = '#3a2c20'; x.fillRect(274, 41, 22, 5);
      x.fillStyle = '#d8a85a'; x.fillRect(262, 120, 4, 8); x.beginPath(); x.arc(264, 129, 5, 0, Math.PI); x.fill();
    });
    const cay = mk((x) => {
      sky(x, '#b8c4c8', '#e8e0cc'); sea(x, 112);
      x.fillStyle = '#4c5448'; x.beginPath(); x.moveTo(20, 118); x.quadraticCurveTo(120, 74, 300, 112); x.lineTo(300, 124); x.lineTo(20, 126); x.fill();
      for (let i = 0; i < 16; i++) { const bx = 110 + i * 11, by = 94 + Math.sin(i * 1.7) * 4; x.fillStyle = '#2a2a2a'; x.fillRect(bx, by, 1, 8); x.fillStyle = '#d0a458'; x.beginPath(); x.arc(bx + 1, by + 9, 2.4, 0, 7); x.fill(); }
      x.fillStyle = '#d8d0bc'; x.fillRect(50, 100, 36, 18); x.fillStyle = '#5a5e68'; x.beginPath(); x.moveTo(46, 100); x.lineTo(68, 88); x.lineTo(90, 100); x.fill(); x.fillStyle = '#ffd68a'; x.fillRect(64, 106, 6, 6);
    });
    const A = SCREENS.caches.area;
    if (!A.p17c_harbour) A.p17c_harbour = harbour;
    if (!A.p17c_cay) A.p17c_cay = cay;
    Object.assign(SCREENS.FAMILY, { [HARBOUR]: 'p17c_harbour', [CAY]: 'p17c_cay', [OFFICE]: 'hall', [CHANDLER]: 'workshop', [WIDOW]: 'hearth' });
  }

  // ---------------------------------------------------------------- the extra, begun and finished
  const PLACES_CANT = {};
  function placeList() {
    if (!Object.keys(PLACES_CANT).length) Object.assign(PLACES_CANT, {
      [TX.place.mast]: [80.2, 48.6], [TX.place.mole]: [74.4, 51.0], [TX.place.office]: [39.5, 50.5], [TX.place.steps]: [21.5, 57.6], [TX.place.stair]: [46.5, 42.2],
      [TX.place.chandler]: [27.5, 35.5], [TX.place.widow]: [47.5, 29.5], [TX.place.cistern]: [39.5, 16.5], [TX.place.cay]: [59.4, 54.1],
    });
    return PLACES_CANT;
  }
  function start() {
    validate(); resetRun();
    try { if (typeof Weather !== 'undefined' && Weather.load) Weather.load(null); } catch (e) { /* ignore */ }
    ensureCoats();
    // a short sword at the belt, so the harbour is not seen through the glowing casting hands
    try { const p = G.player; if (Array.isArray(p.weapons)) { if (!p.weapons.includes('sword')) p.weapons.push('sword'); p.weapon = p.weapons.indexOf('sword'); } } catch (e) { /* ignore */ }
    G.day = B.DAY; G.tod = B.TOD; G.player.gold = B.PURSE;
    setf('act', 1);
    try { journal('main', TX.ex.journal); } catch (e) { /* ignore */ }
    loadMap(HARBOUR, { x: 79.5, y: 53.4, dir: Math.PI });
    G.state = 'play';
    showEvent(TX.ex.id, '<span class="muted">' + TX.ex.kicker + ' · ' + TX.ex.date + '</span><br><br>' + TX.ex.card, [{ t: TX.ex.go, f: () => {} }]);
    return true;
  }

  // ---------------------------------------------------------------- wiring: wrappers, never edits
  function wrap() {
    if (typeof useDeco === 'function') {
      const _f = useDeco;
      useDeco = function (e) {
        try { if (e && typeof e.use === 'string' && e.use.indexOf('p17c_') === 0 && onUse(e)) return; } catch (er) { console.warn('cantabile17 use failed', er); }
        return _f.apply(this, arguments);
      };
    }
    if (typeof wallLabel === 'function') {
      const _f = wallLabel;
      const LOOK = { [TEXN.cliff]: TX.harbour.cliff, [TEXN.rail]: TX.harbour.rail, [TEXN.quay]: TX.harbour.step, [TEXN.ash]: TX.top.label, [TEXN.shut]: TX.top.label, [TEXN.slate]: TX.top.label, [TEXN.mole]: TX.harbour.mole };
      wallLabel = function (cell) {
        try { if (cell && typeof cell.tex === 'string' && has(LOOK, cell.tex) && typeof cell.label !== 'string') return LOOK[cell.tex]; if (cell && typeof cell.tex === 'string' && TEXN.pl.indexOf(cell.tex) >= 0) return TX.harbour.shut; } catch (er) { /* default */ }
        return _f.apply(this, arguments);
      };
    }
    if (typeof update === 'function') {
      const _f = update;
      update = function (dt) {
        const r = _f.apply(this, arguments);
        try { tick(dt); } catch (er) { console.warn('cantabile17 tick failed', er); }
        return r;
      };
    }
    if (typeof doRest === 'function') {
      const _f = doRest;
      doRest = function () {
        try { if (inMine(G.mapId)) { say(TX.harbour.noRest, 'warn', 6500); return; } } catch (er) { /* default */ }
        return _f.apply(this, arguments);
      };
    }
    if (typeof placeSet === 'function') {
      const _f = placeSet;
      placeSet = function () {
        try { if (inMine(G.mapId)) return { list: placeList(), hub: HARBOUR, name: 'Port Cantabile' }; } catch (er) { /* default */ }
        return _f.apply(this, arguments);
      };
    }
    if (typeof loadMap === 'function') {
      const _f = loadMap;
      loadMap = function (id, pos) {
        try { ensureCoats(); validate(); if (inMine(id)) applyMapState(id); } catch (er) { console.warn('cantabile17 load failed', er); }
        const r = _f.call(this, id, pos);
        try { if (inMine(G.mapId)) { applyMapState(G.mapId); arrive(); } } catch (er) { console.warn('cantabile17 arrival failed', er); }
        return r;
      };
    }
    if (typeof buildAllMaps === 'function') {
      const _f = buildAllMaps;
      buildAllMaps = function () {
        const maps = _f.apply(this, arguments);
        try {
          ensureCoats();
          maps[HARBOUR] = buildHarbour(); maps[OFFICE] = buildOffice(); maps[CHANDLER] = buildChandler(); maps[WIDOW] = buildWidow(); maps[CAY] = buildCay();
          resetRun();
        } catch (er) { console.warn('cantabile17 maps failed', er); }
        return maps;
      };
    }
    if (typeof startGame === 'function') { const _f = startGame; startGame = function () { resetRun(); return _f.apply(this, arguments); }; }
    if (typeof restoreGame === 'function') { const _f = restoreGame; restoreGame = function () { resetRun(); const r = _f.apply(this, arguments); try { validate(); } catch (e) { /* ignore */ } return r; }; }
  }

  function init() {
    paintTextures(); paintProps(); installCatalog();
    wrap(); wireMusic(); paintCards();
    try { if (typeof EXTRAS17 !== 'undefined') EXTRAS17.register({ id: ID, title: TX.ex.id, blurb: TX.ex.blurb, start, unlocked: () => true }); } catch (e) { console.warn('cantabile17 register failed', e); }
  }
  init();

  return {
    FP, ID, MAPS, B, T, TX, LIST, FLAGS, STAIR, TEXN, FLOORS, F, ITEM_DEFS, NPC_DEFS, CAY_GRAVES, CAY_BARE, HOUSE_X, COATS,
    fint, setf, validate, start, finishExtra, resultText, answerReef, payDues, ringBottle, strikeBell, useCrate, useHook, useMast, useBoard, useListen, onUse,
    stairLevel, buildHarbour, buildOffice, buildChandler, buildWidow, buildCay, applyMapState, arrive, reefTick, setKey, resetRun, tick, slackNow, ambience, chime, graveChime, gull, bellSound,
    teagueQuest, oonaQuest, bessaQuest, teelQuest, sloeQuest, taceQuest, dunmoreQuest, quainQuest, hesperQuest, magsQuest, ferry, placeList, paintCards, capLine, AU,
  };
})();
