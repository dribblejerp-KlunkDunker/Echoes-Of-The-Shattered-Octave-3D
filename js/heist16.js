// ============================================================
//  heist16 — Phase 16 "New ground", team HEIST: two optional night jobs.
//
//  1. THE HELD LETTERS [PROPOSED] (the Church). There is no Synod cathedral in the Reach; the Church's house in Oakhaven is
//     the Chapel of the Carillon, and Gazette No. 32 says that messages between the Cantor and parties beyond the Hedge
//     "may be left at the Chapel, where they will be held". They are held: in the undercroft below the vestry, in one
//     sealed cabinet. A new map, "The vestry and undercroft" (p16h_vestry), is reached by a low door in the Chapel's west
//     wall. A Proctor warden walks the archive in a loop; lamps make pools of light; the back stair is dark.
//       PLAN   Dessa Quill (new, on the Chapel steps) tells three things, one at a time: the Warden's rounds (ROUTE), when
//              the Chapel is singing (WINDOW; the notice board in the nave says it too) and who has the keys (KEYS; the
//              sexton, Orrin Pale, says it as well). All three = "planned".
//       IN     Night (dead of night, 21:00-05:00) by the lock, a live sermon (js/synod15.js: the Warden stands with the
//              deacon, the hymn comes down the floor), or Orrin's key (30 sovereigns, any hour).
//       TAKE   Six letters from the Held Cabinet (3 tumblers by the game's own lockpicking, Orrin's key, or force).
//       OUT    By the door or the coal-hatch. Delivering a letter to its person (Lyra, Kaelen, Hetty, Orla, Pim, Dessa) is
//              the payoff: a few short lines, standing, a little coin.
//  2. DEPOT THREE [PROPOSED] (the Consortium). The quarry depot has a door in its south-east corner (the Factor's counting
//     room, p16h_depot3), open from the night bell (22:00) to the morning one (06:00). Factor Vosk's ledgers: "Reconciliation
//     has not finished". The bore bites for 8 s in every 22 and covers sound; two guards, a clerk who can be paid, and a
//     safe (3 tumblers again, or the sledge). Take: the roster ledger (the persons without a roster number) and the lease
//     copy (Aldric's signature, 414, as Book One has it; Reeve Mossbrook witnessed it). Give them to Sergeant Vause, the Compact steward or Reeve Mossbrook.
//
//  BOTH: plan -> in -> take -> out; a heist page in the logbook that fills as you learn things; quiet / bribe-or-disguise /
//  loud (and the sermon window for the Chapel). Being seen = the existing law (reportCrime, the arrest panel, the watch-house)
//  and the haul is seized; being loud = the crime is reported but you may keep what you took if you get out. Nothing here
//  can lock you in: every inner passage is open, both maps have two ways out, the exit doors are never locked. The Rite,
//  the main quest and every story flag are never touched. Both close at the Rite or the Greening with one logbook line.
//
//  BALANCE (one table, B). SWITCH: Options -> Graphics & access -> "Heists" (default On, localStorage octave.heist16.v1).
//  Off = the original game: the doors stay shut, nobody asks, no wrapped behaviour does anything.
//  STATE: G.flags under p16h_ only, small validated integers (FLAGS). Guards and the new people are transient (rebuilt from the
//  flags when you walk in), never saved. Every invented fact is marked [PROPOSED]; every player-visible string is in TX.
//  ART: procedural stand-ins (canvas, cached once).
// ============================================================
'use strict';

const HEIST16 = (function () {
  const KEY = 'octave.heist16.v1';
  const cfg = { on: true };
  function loadCfg() {
    try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o && typeof o === 'object' && typeof o.on === 'boolean') cfg.on = o.on; } catch (e) { /* storage blocked: the default stands */ }
  }
  function saveCfg() { try { localStorage.setItem(KEY, JSON.stringify({ on: cfg.on })); } catch (e) { /* ignore */ } }

  const MAP_V = 'p16h_vestry', MAP_D = 'p16h_depot3';

  // ---------------------------------------------------------------- the balance table
  const B = {
    // windows (hours of the game clock, G.tod * 24)
    L_NIGHT: [21, 5],               // the Chapel: dark from the ninth hour of the evening to the fifth of the morning [PROPOSED]
    D_NIGHT: [22, 6],               // the quarry: the night bell to the morning bell [PROPOSED]
    // seeing and hearing (cells)
    HALF_CONE: 0.85,                // half-angle of a guard's sight, radians (about 49 degrees)
    RANGE_LIT: 7, RANGE_DARK: 3.8,  // how far a guard sees you in a lamp's light / in the dark
    LAMP_R: 3.5,                    // how far a lit lamp lights you
    BUMP: 1.2,                      // closer than this and the guard notices you whatever way he faces
    GAIN: 0.9, GAIN_BUMP: 2.5,      // suspicion per second at half range / when bumped; 1.0 = seen
    DECAY: 0.5,                     // suspicion lost per second when unseen
    NOISE_MULT: 0.12,               // each point of noise over 2.4 raises the gain by this much
    HEAR_AT: 3.0, HEAR_K: 1.7,      // a guard hears noise above this (running) within (noise - 2.2) * K cells, and goes to look
    LOOK_SECS: 5,
    SPEED: 1.25,                    // a patrolling guard, cells per second
    // the covers
    HYMN_NOISE: 2.0,                // a sermon over your head: your noise is held at most this
    BORE_PERIOD: 22, BORE_GRIND: 8, BORE_NOISE: 1.0,   // the bore bites 8 s in 22: your noise is held at most this and nobody hears
    // bribes
    L_BRIBE: 30, D_BRIBE: 40,       // sovereigns: Orrin Pale, Ines Tarn
    L_AWAY: 90, D_AWAY: 75,         // seconds the Warden / Pike are "at supper" after a bribe
    // locks
    L_CAB_DIFF: 3, L_BOX_DIFF: 2, D_SAFE_DIFF: 3,
    // alarm fallout
    BOUNTY: 40,                     // the Oakhaven watch's warrant for a break-in, either place
    L_SYNOD: -4, D_OFFICE: -3, D_SYNOD: -2,
    WATCH_SECS: 10, REINF_SECS: 12, // the constable / the two Legionnaires come this long after the alarm
    // payoffs
    L_OUT_XP: 60, L_OUT_HEDGE: 2, L_FEE: 36,
    L_LETTER: {                     // [hedge, gold, xp] per letter delivered; exact
      lyra: [3, 0, 20], kaelen: [3, 0, 20], hetty: [2, 8, 15], orla: [2, 6, 15], pim: [2, 0, 15], dessa: [2, 0, 15] },
    L_ALL_HEDGE: 4,                 // all six
    D_OUT_XP: 70, D_CASH: 50,
    D_GIVE: {                       // exact: [hedge, synod, gold, xp]
      rv: [2, 4, 0, 40],            // the roster to Sergeant Vause
      rs: [6, 0, 30, 40],           // the roster to the Compact steward
      lm: [-4, 0, 60, 30],          // the lease to Reeve Mossbrook
      ls: [5, 0, 0, 40],            // the lease to the Compact steward
    },
    NEAR: 3.2,                      // how close a person must be for a hand-over by "use"
  };

  // ---------------------------------------------------------------- text (every player-visible string goes through S)
  const LIST = [];
  const S = (t) => { LIST.push(t); return t; };
  const TX = {
    opts: {
      label: S('Heists'),
      hint: S('two optional night jobs: the held letters under the Chapel, and Depot Three at the quarry. Off: the doors stay shut and nobody asks.'),
    },
    names: {
      dessa: S('Dessa Quill, letter-writer'),
      orrin: S('Orrin Pale, sexton'),
      steward: S('Steward Merrin Oake, Timber Compact'),
      vause: S('Sergeant Vause, Quarry Gate'),
      mossbrook: S('Reeve Alder Mossbrook'),
      ines: S('Ines Tarn, night clerk'),
      warden: S('Warden Hask'),
      reckoner: S('Night-Reckoner Dray'),
      pike: S('Corporal Pike'),
      legionnaire: S('Quarry Legionnaire'),
      constable: S('Chapel watch constable'),
      mapV: S('The vestry and undercroft'),
      mapD: S('Depot Three, after hours'),
    },
    // ---- Dessa Quill, on the Chapel steps [PROPOSED]
    dessa: {
      greet: {
        polite: S('Does it ring? True enough, if you keep it low. I write letters for people who cannot, and I sit where the Chapel can see me, so nobody says I hide it.'),
        normal: S('Does it ring? I write letters. Forty-one since the gate was barred. Not one has had an answer.'),
        blunt: S('If you want a letter written, say what to put in it. If you want to shout, the Hedge will oblige.'),
      },
      intro: S('The Gazette says messages for the Cantor, or for anyone beyond the Hedge, "may be left at the Chapel, where they will be held". I have left forty-one. They are held. I mean held. What comes in from outside is held as well: my sister\'s hand, my sister\'s seal, three times now. I watched the sexton carry the last one down the vestry stair, and the stair has a door at its foot, and it did not come back up.'),
      again: S('You again. Have you thought about the stair under the vestry? I think about nothing else. I have sat here nine nights.'),
      yes: S('Then someone should fetch them out.'),
      no: S('That is not my quarrel.'),
      declined: S('No. No, I would not either, in your boots. I will be here.'),
      accept: S('"Not by asking. I asked." She keeps her eyes on the street. "There is an undercroft under the vestry, where the Chapel keeps what it holds: a cabinet, with a seal on it. I do not want only mine. I want everyone\'s. There will be one in it for someone you know, I think. Ask me how it is watched, when it is not, and who has the keys. Softly."'),
      qRoute: S('How is it watched?'),
      qWindow: S('When is nobody looking?'),
      qKeys: S('Who has the keys?'),
      route: S('"A Proctor, Hask, the Chapel\'s warden. After the last hymn he walks the archive: along the corridor, up the east aisle to the cabinet, where he stops and reads the seal as if it might have changed. Then across the top, down the middle aisle, up the west aisle and down again, and back to the corridor. A little over a minute a round, by the bell, nine nights running. He does not hurry and he does not look behind a shelf. The back stair from the robing room comes out in the west aisle, and it has no lamp."'),
      window: S('"When the whole Chapel is singing. Stasisday at dusk, Memoryday in the evening, Dawnday at first light. The Warden stands with the deacon then, and the sexton counts heads, and the floor carries the hymn down the stair. Drop a stone down there and nobody upstairs would hear it."'),
      keys: S('"The sexton, Orrin Pale. He wears the ring, and the ring has the vestry door on it. He is not a hard man. He has a daughter on the far side, and the Chapel has held three of her letters. Thirty sovereigns, and he will have been asleep. Or pick it: a brass tumbler lock, nothing grand. There is a coal-hatch at the head of the back stair, barred from inside only."'),
      planned: S('"That is all I have, and it is more than the Chapel knows I have. Go when you like. If they take you, you never heard my name."'),
      waiting: S('"Ask me what you need. Softly."'),
      out: S('"You have been down. I can see it on your sleeves. Say nothing here. Keep the letters dry, and take each one to the person it is written to. I have waited a long time to be the second person to know what a stranger did."'),
      deliver: S('Give her the letter written to her'),
      done: S('"Quiet. They are being read, I hear. A Gazette that says nothing and a street that says everything. Thank you. Go on, now; I have a letter to write, and this time I think it will be answered."'),
      closed: S('"The Chapel has what it has. I do not go near it now. Does it ring? Not for me."'),
    },
    // ---- Orrin Pale, the sexton [PROPOSED]
    orrin: {
      greet: {
        polite: S('The Chapel is open to all who keep to the Note. Mind the step.'),
        normal: S('Keep your voice down in here, if you would. The floor carries.'),
        blunt: S('This is a house of the Note. Shout in the lane.'),
      },
      hook: S('He keeps his hand on a ring of keys and his eyes on the floor. "If it is about letters," he says, very low, "I do not discuss letters."'),
      keysKnown: S('He looks at the door in the west wall, and at you, and at the floor. "A man with a daughter on the other side of the Hedge," he says, "might sleep very soundly, for thirty sovereigns. A man who did not sleep might hear a lock, and take it for the wind."'),
      pay: S('Pay Orrin thirty sovereigns'),
      noPay: S('Not today'),
      paid: S('The coins go into his sleeve without a sound. "I shall be asleep in the nave," he says, "from now until the lamps are trimmed. The door is on the latch. The Warden has been told to take his supper." He does not look at you again.'),
      poor: S('"Thirty," he says. "I did say thirty." He turns away to trim a lamp.'),
      after: S('He is asleep. Anyone can see he is asleep.'),
      done: S('"I did not sleep," Orrin says, to the lamp-wick. "I wish to be clear. I did not sleep. Three letters came for my girl this week, they say, by the other door. Thank you."'),
      sleeping: S('Orrin Pale, asleep on the bench by the vestry door, his keys in his lap, and one eye not quite closed.'),
    },
    // ---- the Chapel, the vestry door
    chapel: {
      board: S('The notice board by the altar step. The hymn hours are chalked on it for the week: STASISDAY AT DUSK. MEMORYDAY IN THE EVENING. DAWNDAY AT FIRST LIGHT. Under them, in the sexton\'s small hand: "Warden to stand with the deacon. Vestry stair to be latched."'),
      boardLearn: S('You read the hymn hours twice. The Warden stands with the deacon at every one of them, and the vestry stair is latched. It is the only time the stair is not walked.'),
      doorShut: S('The vestry door: a low door beside the shelf, with a brass tumbler lock. The sexton\'s eye is on it. By day the nave is full of people who would remember a stranger at that lock. Come when the Chapel is singing, or when it is dark.'),
      doorGone: S('The vestry door has a new lock on it, and a new bolt, and a sexton who is awake. The Chapel does not mean to be robbed twice.'),
      boardLabel: S('The notice board'),
      doorLabel: S('The vestry door'),
      doorLabelShut: S('A low door beside the shelf'),
    },
    // ---- the vestry and undercroft, looking and reading [PROPOSED]
    look: {
      robes: S('Choir robes on pegs, grey and white, the white gone yellow at the cuffs. A deacon\'s stole on a hook of its own. Nothing here has been worn since the Rite was set.'),
      shelf: S('Candle-ends, a snuffer, a missal with a broken spine. A saucer of milk for something that has not come.'),
      table: S('A vestry table with a ledger lying open: HELD, entered by the day. The last line reads: "Received, one, from beyond the Hedge, for the Cantor. Held. Held. Held." Somebody has been ruling the page off with a very straight rule.'),
      pig1: S('Pigeonholes to the ceiling, each with a name card. HALE. MARREN. WICK. TARROW. PELLOW. Every hole is full. Every card has the same stamp under the name: HELD PENDING RECONCILIATION OF THE ADDRESSEE.'),
      pig2: S('A pigeonhole with the card turned face to the wall, and a child\'s drawing of a boat pinned to the back. You turn the card. The name is rubbed out. The letter inside is addressed to "whoever will take it".'),
      pig3: S('The cards here are in many hands, none of them the Chapel\'s: the families wrote their own, so the letters would be found. They are in the order they came. The newest are at the top and nobody has come down to sort them.'),
      pig4: S('Letters stacked like bricks, tied in fives with red tape. The tape has been knotted by someone who counted. On top, a slip: "To be released on instruction of the Office. No instruction received. No instruction expected."'),
      rack: S('A rack of seals and sealing-wax, a lamp, a press. The Chapel opened nothing, it seems. It resealed everything.'),
      cot: S('A cot with a grey blanket, a boot-jack, a tin cup. The sexton\'s, for the nights the Warden is short.'),
      hatchLocked: S('A coal-hatch above a ladder, barred from inside. Anyone below could lift the bar.'),
      lamp: S('A hush-lamp. Its reed-whistle keeps the room from going silent. It is bright enough to be seen by.'),
      lampOut: S('A hush-lamp, doused. The whistle in it has stopped, and the dark around it is a good deal thicker.'),
      douse: S('You pinch the wick. The whistle stops.'),
      lampUsed: S('It is already out.'),
      exit: S('Up the stair, to the Chapel'),
      hatch: S('Up the coal-hatch, to the lane'),
      cabinet: S('The Held Cabinet: oak, iron-cornered, with a seal across the doors and a brass tumbler lock. Through the crack, paper. A great deal of paper.'),
      cabinetOpen: S('The Held Cabinet, open and nearly empty. The seal hangs from one door by a thread.'),
      cabinetGone: S('The Held Cabinet. The Chapel has filled it again with blank sheets, and put a second seal on it.'),
      box: S('The sexton\'s strongbox. HOLDING FEES, it says on the lid: a sovereign a letter, to hold what should have been delivered for nothing.'),
      boxOpen: S('The strongbox, open and empty. The ledger inside lists the fees. Every line is in the Chapel\'s hand.'),
    },
    // ---- the cabinet and the box: choices
    take: {
      cabTitle: S('The Held Cabinet'),
      cabBody: S('Oak and iron, a seal across the doors, and behind them the letters nobody was allowed to read: some for the Cantor, some from her, a great many for people whose only crime was to live on the other side of a hedge. Six of them have a name on the front that you know.'),
      cabKey: S('Unlock it with Orrin\'s key'),
      cabPick: S('Pick the brass tumblers'),
      cabForce: S('Force the doors (everything in the Chapel will hear, unless a hymn is up)'),
      forceCover: S('You wait for the downbeat of the hymn, and put your shoulder to the doors. The floor takes the sound and carries it up with the rest.'),
      cabLeave: S('Leave it'),
      cabTook: S('Six letters, tied with red tape, and the tape cut. You put them inside your coat, against the breastbone, and you do not look at the names again until you are outside.'),
      cabJournal: S('I took the six letters from the Held Cabinet: for Lyra, for Kaelen, for Hetty, for Orla Hale, for Pim, and one for Dessa Quill. They must go to the people they are written to.'),
      boxTitle: S('The holding-fee box'),
      boxBody: S('A small iron box. The fees the Chapel took for keeping people\'s letters from them.'),
      boxPick: S('Pick the lock'),
      boxForce: S('Break it open (loud)'),
      boxTook: S('Thirty-six sovereigns, in the Chapel\'s own coin. You think of them as the postage.'),
    },
    // ---- letters (six; the texts are [PROPOSED])
    letters: {
      lyra: {
        item: S('Letter for Lyra Ashgrove'),
        desc: S('A folded sheet in an aunt\'s hand, held at the Chapel since before the gate was barred. For Lyra Ashgrove, Cantor of Oakhaven, Cooper\'s Row.'),
        title: S('A letter for Lyra Ashgrove'),
        text: S('Lyra, the reed you sent came back to me whole, so you are alive. I tuned it to your breastbone as Tobin taught me, and it still answers. The Bazaar keeps its clocks and I keep my ears. They say the Hedge is shut. A shut thing can be opened. Eat something. <i>Wennet.</i>'),
        react: S('She reads it standing, and then again sitting down. "Wennet," she says. "She never wrote a word without a correction." She folds it small. "Thank you. Do not tell me what it cost."'),
      },
      kaelen: {
        item: S('Letter for Kaelen Vance'),
        desc: S('A folded sheet in a father\'s hand, held at the Chapel. For Kaelen Vance, at the charcoal-burner\'s hut outside the Hedge.'),
        title: S('A letter for Kaelen Vance'),
        text: S('Kael. I will not ask you to come to the house, and you may take that as the whole of my letter. I keep your chair. Your mother would have told you to say so to someone if the arm hurts; I am telling you instead, and badly. It is not weakness to be carried. Come when you can bear to be seen. <i>A. V.</i>'),
        react: S('He reads it with the glass hand held away from the paper, as if it might mark it. For a long time he says nothing. "My father," he says at last, "has never in his life told anybody that it is not weakness to be carried." He puts it inside his coat, on the left.'),
      },
      hetty: {
        item: S('Letter for Hetty'),
        desc: S('A folded sheet in a bargeman\'s hand, held at the Chapel. For Hetty Bram, at the Boar and Dulcimer.'),
        title: S('A letter for Hetty'),
        text: S('Het, they will not let the barges through the Hedge lock, so I send this the way they say: left at the Chapel. I have your share of the eel money in a sock under the loose board at the Landing. Keep the dulcimer tuned. Does it ring? <i>Cob.</i>'),
        react: S('Hetty reads it twice and laughs once, wetly. "Cob. A sock under a board. He always did think a sock was a bank." She puts eight sovereigns in your hand for the postage and will not hear a word against it.'),
      },
      orla: {
        item: S('Letter for Orla Hale'),
        desc: S('A folded sheet in a daughter-in-law\'s hand, held at the Chapel. For Orla Hale, in her own house.'),
        title: S('A letter for Orla Hale'),
        text: S('Mother Orla, the baby has your chin and your temper and we have called her Orla. She does not yet know how to be quiet, and I hope nobody teaches her. We are well. We are at the Landing. We count the days. <i>Ness.</i>'),
        react: S('Orla holds it at arm\'s length for the light, and then close. "Orla," she says. "They have called it Orla. Sap and splinters, the poor child." She is crying and she is furious about it. She gives you six sovereigns for no reason she will name.'),
      },
      pim: {
        item: S('Letter for Pim'),
        desc: S('A folded sheet in a carder\'s hand, held at the Chapel. For Pim, at the carders\' mill.'),
        title: S('A letter for Pim'),
        text: S('Pim, I am at the Landing with your cousins. I tried the north road and the gate was barred before I reached it. Do as your mother says. I count to eight every night, the way your da did, so that you will have been counted. <i>Gran.</i>'),
        react: S('Pim cannot read all of it. Nell reads it to him from behind, with her chin on his head, and he counts along on his fingers. Eight. He holds up the eighth and looks at it for a while.'),
      },
      dessa: {
        item: S('Letter for Dessa Quill'),
        desc: S('A folded sheet in a sister\'s hand, held at the Chapel. For Dessa Quill, letter-writer, on the Chapel steps.'),
        title: S('A letter for Dessa Quill'),
        text: S('Dess, I wrote to you three times at the Chapel and I am writing a fourth. I am well. I am cold. The boy is walking. I put a lock of his hair in this fold; you will have to guess the colour. Write. <i>Imelda.</i>'),
        react: S('Dessa takes it without looking at you. She reads the first line and stops, and puts the page to her face. "She wrote the fourth," she says. "She said she would." She says nothing else for some time, and you do not ask her to.'),
      },
      allTitle: S('Letter-Bearer'),
      wrongPlace: S('This is addressed to someone else. Find them, and put it in their hand.'),
      readFold: S('Fold it away'),
      closedWorld: S('The post has stopped. The letter is only a letter now, and the person it was written to is somewhere you cannot reach.'),
      notHere: S('The person it is written to is not here.'),
      deliverBtn: S('Give it to them'),
      readOnly: S('Read it again'),
    },
    // ---- Chapel heist: the flow
    l: {
      enter: S('The door gives onto a stair, and the stair onto a low vaulted room that smells of wax and cold iron. Somewhere beyond it a pair of boots goes steadily on stone.'),
      enterBribed: S('The door is on the latch, as promised. The stair is warm from the lamp. Somewhere beyond it, nobody is walking: the Warden has been told to take his supper.'),
      enterSermon: S('The hymn comes down through the floor, a hundred voices on one note, and the Warden\'s boots are not among the sounds. It is the only time the stair is not walked.'),
      seen: S('The Warden stops. He does not shout. He sets his hand on the whistle at his belt, and says, quite evenly, "The Chapel holds what is given to it." Then he blows.'),
      loud: S('The doors give with a crack that goes up the stair like a bell. Overhead, the hymn falters. Boots, and then more boots.'),
      seized: S('The Warden takes the letters out of your coat as if he were counting them back into a drawer. They go into the cabinet. The seal goes back on.'),
      crime: S('breaking into the Chapel vestry'),
      watch: S('A constable of the parish watch has come down the stair, whistle in hand.'),
      outClean: S('The lane is cold and the sky is the wrong colour for the hour. Six letters, and not one boot behind you. For the first time in nine nights Dessa will not be sitting on the steps looking at the vestry door.'),
      outLoud: S('You come out into the lane with the whistle still going behind you, and six letters against your ribs. The Chapel will remember this.'),
      outEmpty: S('You come out with nothing but the cold. The cabinet is still sealed. They will be a long time forgetting your face.'),
      j: {
        offer: S('Dessa Quill, who writes letters on the Chapel steps, says the letters "held" at the Chapel are kept in an undercroft under the vestry, in a sealed cabinet. Hers are in it. So, she thinks, is a letter for someone I know.'),
        planned: S('I know now how the vestry is watched, when it is not, and who has the keys. The plan is whole. I can go in when the Chapel is dark, or singing, or when the sexton has been paid to sleep.'),
        in: S('I am in the undercroft below the Chapel. The Held Cabinet is at the far end, past the Warden\'s round.'),
        took: S('I took the six letters from the Held Cabinet. Now to get them out.'),
        outClean: S('Out of the Chapel with the six letters and nobody the wiser. They are for Lyra, Kaelen, Hetty, Orla Hale, Pim and Dessa Quill.'),
        outLoud: S('Out of the Chapel with the six letters, and the Chapel knows it. The watch has my description.'),
        failed: S('I was seen in the undercroft and the letters went back into the cabinet. I can try again, but the Warden will be looking for me.'),
        all: S('The six held letters have reached the people they were written to. The Chapel has not said a word.'),
        closed: S('Oakhaven is no longer what it was. The letters from the Chapel I did not deliver are only paper now.'),
      },
    },
    // ---- Depot Three
    steward: {
      greet: {
        polite: S('Does it ring? True enough. We are the Timber Compact; we cut what the Consortium counts, and nobody counts us.'),
        normal: S('Compact steward. If you are the Consortium\'s, say so and I will move my wagon.'),
        blunt: S('Say what you want or say nothing. We have had a great deal of the second.'),
      },
      intro: S('The Gazette says "persons without a roster number are not on the quarry". I have eleven in my books that were on it. Their wages were paid until the day the Consortium started reconciling Depot Three, and then they were not on the quarry, and then they were not anywhere. Vosk keeps the roster in the counting room off the depot. A safe, a clerk, two guards, and the bore: you hear it all night. I cannot go in. I am known.'),
      again: S('You again. Have you thought about the counting room? I am only asking.'),
      yes: S('Then somebody should look at that roster.'),
      no: S('That is not my quarrel.'),
      declined: S('Nobody\'s quarrel is the one they are in. I will be here.'),
      accept: S('"There is a door at the south-east corner of the depot, a plain one, locked, with the Consortium\'s seal on it. It is open from the night bell to the morning bell. Ask me how it is watched, when the noise is, and what the clerk will take. Quietly: the Legion walks the clearing."'),
      qRoute: S('How is it watched?'),
      qBell: S('When is the noise?'),
      qSafe: S('Who has the safe?'),
      route: S('"Two on the night shift. A Proctor, Dray, the Night-Reckoner: he walks the corridor, goes round the counting floor, the corridor again, round the bore gallery, and back, a minute and a half a round with his rests. A Legionnaire, Pike, who keeps the east half of the strongroom and walks three paces each way. The safe is in the west half, behind a brass screen, in the dark; the strongroom door is the one arch off the corridor. They do not talk. I would have said they were friends, once."'),
      bell: S('"The bore bites for eight breaths in every twenty-two: hear it a hundred times and you stop hearing it, and so do they. While it bites you could drop an anvil. Then it stops, and every sound goes down the corridor. The night bell is the tenth hour. The day shift is off by then, and the clerk is in her chair."'),
      safe: S('"The clerk is Ines Tarn, and she is owed four months. Forty sovereigns and she goes for tea, and Pike goes with her; he has not been out of that room in a year. The safe is Vosk\'s own: brass, three tumblers. A sledge will open it, loudly. A good hand will open it quietly. Either way you want the roster and the lease. The lease has the Reeve\'s name on it."'),
      planned: S('"That is everything I know. It is more than I should. If you are taken, you never heard my name, and I never heard yours."'),
      waiting: S('"Ask what you need. Quietly."'),
      out: S('"You have been in. I can smell the bore on you. Whatever you took, put it in the right hand: the Sergeant at the Quarry Gate has been counting wrong on purpose and hates it; the Reeve will pay to have his name forgotten; or give it to me and we will read it aloud."'),
      giveRoster: S('Give the roster ledger to the steward'),
      giveLease: S('Give the lease copy to the steward'),
      rs: S('He reads it by the light of a pipe. Eleven names, then thirty, then more. He turns to the last page and shuts the book very carefully, as one shuts a door on a sleeping child. "Right," he says, and gives you thirty sovereigns from the Compact\'s strike fund, and the Compact does not cut tomorrow.'),
      ls: S('He reads the names at the foot twice, to be sure of them. "Aldric Vance, Governor, four hundred and fourteen. Witnessed: Alder Mossbrook, for the Reeve-Moot." He folds it as small as it will go. "I shall read this at the moot, aloud, in a voice that carries. The Reeve may have thought we could not read."'),
      done: S('"They are saying it in the lanes," he says. "Not what it is. That someone has read it. That is the beginning, and it is enough."'),
      closed: S('"The quarry has what it has. We have gone on cutting, because there is nothing else to do. Does it ring? Not for us."'),
    },
    vause: {
      greet: {
        polite: S('Good day. Quarry Administration, Quarry Gate. If you have papers, I will read them. If you have none, I will say I did not see you.'),
        normal: S('Sergeant Vause. This is the Quarry Gate. Are you on the roster?'),
        blunt: S('You may say that again, civilly, or you may leave. I am not in a mood to be tested.'),
      },
      notice: S('She keeps her thumb on the clasp of a count-book and does not look at it. "I count heads at the gate," she says. "I count them in and I count them out. For nine weeks the heads going out have been fewer than the heads coming in, and Reconciliation says that is acoustic echo artifacting." A pause. "I am a sergeant. I have concluded that my superiors are lying. I would like to be wrong."'),
      give: S('Give the roster ledger to Sergeant Vause'),
      rv: S('She reads standing, one page, then the last. Her face does not change, which is how you know. "Three hundred and eleven in the count I was given," she says. "Three hundred and forty-two here." She shuts it and puts it inside her coat. "I will find where the count is wrong. Slowly. Officially. You were never here." The fine for that sentence, you think, would be a great deal more than this.'),
      done: S('"I have been counting again," she says. "Properly. It is noticeable. Nobody has said anything yet."'),
      closed: S('"Quarry Gate is not what it was. I have a count-book with nobody to give it to."'),
    },
    mossbrook: {
      greet: {
        polite: S('The Reeve-Moot is always glad of an honest petitioner. Sit, sit.'),
        normal: S('Alder Mossbrook. Reeve. You will forgive me if I do not stand; the moot ran long.'),
        blunt: S('I have a good deal to do, and none of it is you.'),
      },
      notice: S('He is a big, careful man with a pen he keeps turning in his fingers. "A lease is a thing a man signs at one time, for reasons good at that time," he says, to nobody. "I put my name under a lease. In four hundred and fourteen. For the Reach. It would not be well for it to be read as anything but that."'),
      give: S('Give the lease copy to the Reeve'),
      lm: S('He reads his own name, under the Governor\'s, in his own hand, and puts the paper in the fire without taking his eyes from it. "A kindness," he says. "I shall not forget it." The purse that comes across the table is sixty sovereigns heavy, and it does not feel clean. Behind you, the moot is waiting for its Reeve.'),
      done: S('"The Reach is better with some things unread," he says. "You will not see me at the Compact\'s fires." He does not meet your eye.'),
      closed: S('"The Reach has other Reeves now. I have the paperwork."'),
    },
    ines: {
      name: S('Ines Tarn, night clerk'),
      greet: {
        polite: S('Oh. You are not on the sheet. Please do not tell Corporal Pike I looked up. I am owed four months and I have forgotten how it feels to sit down.'),
        normal: S('Counting-room. Staff only. I did not see you. I am writing.'),
        blunt: S('I have not got a penny and I have not got a minute. Go away.'),
      },
      safeKnown: S('"The safe is Vosk\'s. She had it made with three tumblers and thinks that is clever. Pike will not go for tea alone. He would go with me, if somebody found me forty sovereigns for the four months, and I had a reason to be out of the chair."'),
      pay: S('Pay Ines forty sovereigns'),
      noPay: S('Not now'),
      paid: S('She counts them without looking, as one who has counted far too many things for far too little. "Tea," she says, loudly, to the room. "Corporal. Tea." And then, low, to you: "Seventy-five breaths. I will not come back sooner. I will not say I saw you."'),
      poor: S('"Forty," she says. "Four months. I did say."'),
      after: S('The desk is empty. A cup stands on it with a spoon in it, still turning.'),
      done: S('Her chair is empty. A note on the desk says, in a very small hand: <i>gone to my sister\'s. Reconciled.</i>'),
    },
    d: {
      doorShut: S('The Factor\'s counting room: a plain door at the corner of the depot, with the Consortium\'s seal across it and a notice in the Office voice: DEPOT THREE IS BEING RECONCILED. STAFF ONLY. The day shift is inside. Come back after the night bell.'),
      doorGone: S('The door has been cleared and relocked, and the seal is new. Depot Three has finished reconciling, as far as anyone will say.'),
      boardLabel: S('The shift board'),
      doorLabel: S('Depot Three: the Factor\'s counting room'),
      doorLabelShut: S('A plain door with a seal'),
      board: S('The shift board, chalked on slate by the depot wall: DAY SHIFT OFF AT THE TENTH HOUR, TO THE ADIT. NIGHT BELL AT THE TENTH. BORE BITES: EIGHT BREATHS IN TWENTY-TWO, DO NOT ADJUST. MORNING BELL AT THE SIXTH. Somebody has written under it: <i>or hear everything.</i>'),
      boardLearn: S('You work it out from the board: the bore bites for eight breaths and then stops for fourteen. While it bites, nothing else is heard in the counting room. When it stops, every sound goes down the corridor.'),
      enter: S('A passage, a stair, and a long low room with desks in rows. A lamp at the far end. Under the floor the bore is turning, and every few breaths it bites.'),
      enterBribed: S('The seal has been lifted and the door is on the latch. Ines Tarn is humming at her desk, loudly, as someone who wants to be heard to be doing nothing.'),
      seen: S('The Night-Reckoner stops. He does not shout. He says "Persons without a roster number are not on the quarry," quite kindly, and puts his hand on the horn at his belt.'),
      loud: S('The safe gives with a crash that rings the length of the depot. For a moment the bore is the only sound. Then the horn.'),
      seized: S('The Night-Reckoner relieves you of the ledgers like a man collecting a debt. "Reconciliation," he says, "has not finished."'),
      crime: S('breaking into Depot Three'),
      reinforce: S('Two Legionnaires have come down the passage from the quarry. They are not hurrying. They do not need to.'),
      outClean: S('The passage is cold and the quarry is the wrong colour of dark. The roster and the lease are inside your coat. Behind you the bore bites, and bites, and nobody comes.'),
      outLoud: S('You come out into the quarry with the horn going behind you and two ledgers against your ribs. Depot Three will remember this.'),
      outEmpty: S('You come out with nothing. The safe is still shut, and your face is in the Reckoner\'s book.'),
      j: {
        offer: S('A steward of the Timber Compact says the quarry roster has people on it who were not paid, and people who are not on it who were. The proof is in Factor Vosk\'s counting room off the depot: a roster ledger and a lease copy with a Reeve\'s name on it.'),
        planned: S('I know how the counting room is watched, when the bore covers sound, and who has the safe. The plan is whole. I can go in after the night bell.'),
        in: S('I am in Depot Three, after hours. The safe is in the strongroom, past Pike.'),
        took: S('I have the roster ledger and the lease copy from Vosk\'s safe. Now to get them out of the depot.'),
        outClean: S('Out of Depot Three with the roster and the lease. Nobody saw. Persons without a roster number are on paper at last.'),
        outLoud: S('Out of Depot Three with the roster and the lease, and the Consortium knows it. The watch has my description.'),
        failed: S('I was seen in Depot Three and the ledgers were taken. I can try again, but the Night-Reckoner will have my face.'),
        rv: S('I gave the roster to Sergeant Vause. She says she will find where the count is wrong, slowly and officially.'),
        rs: S('I gave the roster to the Compact steward. The Compact will not cut tomorrow.'),
        lm: S('I gave the lease to Reeve Mossbrook. He burned it and paid me for the kindness. It does not feel clean.'),
        ls: S('I gave the lease to the Compact steward. He will read it aloud at the moot.'),
        closed: S('The quarry has been cleared for the Rite. What I did not hand over is only paper now.'),
      },
    },
    safe: {
      title: S('The Factor\'s safe'),
      body: S('Brass, bolted to the wall, with a plate that says VOSK AND CO. and three tumblers behind it. In there: the roster ledger, a copy of the quarry lease, a purse.'),
      key: S('Use the spare plate-key Ines left'),
      pick: S('Pick the three tumblers'),
      force: S('Break it open with whatever you have (the whole depot will hear, unless the bore is biting)'),
      forceCover: S('You wait for the bore to bite, and bring the sledge down on the beat. Nothing in the depot hears it but the iron.'),
      leave: S('Leave it'),
      took: S('The roster ledger, as heavy as a child. A copy of the lease, the name at the foot clear as a bell. You put them inside your coat, flat, and the purse after.'),
      cash: S('Fifty sovereigns of the Consortium\'s, in the Consortium\'s string.'),
      journal: S('I took the roster ledger and the lease copy from Vosk\'s safe: the persons without a roster number, in the Factor\'s own hand, and the lease the Governor signed in four hundred and fourteen, with Reeve Mossbrook\'s name under his as witness.'),
    },
    items: {
      roster: S('Depot Three roster ledger'),
      rosterDesc: S('A tall ledger bound in grey cloth: the quarry roster, with eleven columns of names against which the Consortium has entered no number. The last column is headed RECONCILED. It is blank.'),
      lease: S('Quarry lease, copy'),
      leaseDesc: S('A lease for the Oakhaven quarry, a copy, in the Consortium\'s clerk\'s hand: the Consortium of Bores takes the quarry, the shaft, and such resonances as lie beneath, for bread at a fixed price, for nine years. At the foot, in a large careful hand: Aldric Vance, Governor, 414. Under it, witnessed: Alder Mossbrook, for the Reeve-Moot.'),
      read: S('You turn the pages. It does not take long to understand them, and it takes a good deal longer to stop.'),
      carry: S('Find the person who should have it: the steward in the clearing, Sergeant Vause at the Quarry Gate, or the Reeve at the Greenhall.'),
    },
    look2: {
      desk: S('A clerk\'s desk, neatly kept. Pens in a row, a blotter, a bell-pull for the Factor. The blotter has the day\'s sums on it, mirror-writing in grey.'),
      desks: S('Desks in rows, each with its stool pushed in. Reconciliation worksheets under paperweights: columns of figures, and at the foot of each, in the same hand, "carried as present, paid as absent".'),
      tally: S('A chalk wall-tally of the bore\'s bites, hundreds of strokes in fives. Beside it, in a different chalk, a column of names with a stroke beside each. The strokes outnumber the names by about a third.'),
      unnumbered: S('A chalk list on the wall of the ledger room, headed THE UNNUMBERED: names and no numbers, in a clerk\'s round hand. Aveline Sorrel. Pol Wick. Gerrit Hale. Ruth Marren. They go down the wall and round the corner. Some have been struck out, and written in again.'),
      reconcile: S('A bench of reconciling tools: a stamp, a pad, a spike for paper, a scale for weighing the figures. The stamp says CARRIED AS PRESENT.'),
      bore: S('The bore\'s shaft: a great iron throat going down into the dark. It turns, and it bites, and the floor hums. It is not tuned to anything you could name.'),
      pumps: S('Pumps, pipes and a gauge that has not moved in a month. The needle is bent where somebody tapped it.'),
      safe: S('The Factor\'s safe. Brass, bolted to the wall, and not the cleverest lock in the Reach.'),
      safeOpen: S('The Factor\'s safe, open. Inside, a purse-shaped dent in the dust.'),
      lamp: S('A hush-lamp. Its reed-whistle keeps the room from going silent. It is bright enough to be seen by.'),
      lampOut: S('A hush-lamp, doused. The dark around it is a good deal thicker.'),
      exit: S('Out to the depot'),
      hatch: S('Out by the service hatch'),
      hatchLocked: S('A service hatch above a ladder. It opens from inside only.'),
    },
    // ---- the heist page in the logbook
    page: {
      title: S('Heists'),
      tab: S('Heists'),
      none: S('Nothing yet. Somebody on the Chapel steps and somebody in the clearing know more than they say.'),
      closeBtn: S('Close'),
      lettersBtn: S('Letters'),
      backBtn: S('Back to the logbook'),
      L: {
        head: S('The Held Letters'),
        sub: S('The Chapel of the Carillon holds what is left with it. The undercroft below the vestry.'),
        s0: S('Not begun'), s1: S('Heard of it'), s2: S('The plan is whole'), s3: S('Inside'), s4: S('The letters are in my coat'), s5: S('Out'), s6: S('All six delivered'),
        kRoute: S('The Warden\'s round: the corridor, the east aisle, the cabinet, across the top, the middle aisle, the west aisle, the corridor. A little over a minute; he does not look behind a shelf. The back stair is unlit.'),
        kWindow: S('The Chapel sings Stasisday at dusk, Memoryday in the evening and Dawnday at first light. The Warden stands with the deacon, and the floor covers the sound.'),
        kKeys: S('Orrin Pale, the sexton, will sleep for thirty sovereigns. Otherwise the vestry door and the cabinet are brass tumblers. A coal-hatch above the back stair opens from inside.'),
        unknownRoute: S('How the vestry is watched: not known yet.'),
        unknownWindow: S('When nobody is looking: not known yet.'),
        unknownKeys: S('Who has the keys: not known yet.'),
        liveNow: S('A sermon is on now.'),
        nightNow: S('It is dark enough now.'),
        tries: S('Times seen: {0}'),
        how: S('How I went in: {0}'),
        howQuiet: S('quietly, by the lock'), howBribe: S('by Orrin\'s key'), howLoud: S('loudly'), howHymn: S('under the hymn'), howRobes: S('in the Synod\'s robes'),
        letters: S('The letters'),
        carried: S('in my coat'), delivered: S('delivered'), left: S('in the cabinet'),
        to: { lyra: S('For Lyra Ashgrove'), kaelen: S('For Kaelen Vance'), hetty: S('For Hetty'), orla: S('For Orla Hale'), pim: S('For Pim'), dessa: S('For Dessa Quill') },
      },
      D: {
        head: S('Depot Three'),
        sub: S('Factor Vosk\'s counting room off the quarry depot. Reconciliation has not finished.'),
        s0: S('Not begun'), s1: S('Heard of it'), s2: S('The plan is whole'), s3: S('Inside'), s4: S('The ledgers are in my coat'), s5: S('Out'), s6: S('Handed over'),
        kRoute: S('Two on the night shift: the Night-Reckoner walks the corridor, the counting floor and the bore gallery; Corporal Pike keeps the east half of the strongroom. The safe is in the west half, out of his sight. A minute and a half a round.'),
        kBell: S('The bore bites for eight breaths in every twenty-two, and covers sound. Day shift off at the night bell; the counting room is open from then until the morning bell.'),
        kSafe: S('Ines Tarn, the clerk, will take Pike for tea for forty sovereigns. The safe has three tumblers; a sledge will open it, loudly.'),
        unknownRoute: S('How the counting room is watched: not known yet.'),
        unknownBell: S('When the noise is: not known yet.'),
        unknownSafe: S('Who has the safe: not known yet.'),
        nightNow: S('The night shift is on.'),
        dayNow: S('It is day shift. Come after the night bell.'),
        tries: S('Times seen: {0}'),
        how: S('How I went in: {0}'),
        howQuiet: S('quietly, under the bore'), howBribe: S('by paying the clerk'), howLoud: S('loudly'), howRobes: S('in the Synod\'s robes'),
        gave: S('The ledgers'),
        rv: S('The roster went to Sergeant Vause.'), rs: S('The roster went to the Compact steward.'), lm: S('The lease went to Reeve Mossbrook.'), ls: S('The lease went to the Compact steward.'),
        haveRoster: S('The roster ledger is in my coat.'), haveLease: S('The lease copy is in my coat.'),
      },
    },
    // ---- the badge
    badge: {
      unseen: S('Unseen'),
      watched: S('Watched {0}%'),
      lit: S('lamplight'),
      dark: S('dark'),
      hymn: S('the hymn covers you'),
      boreOn: S('the bore bites'),
      boreOff: S('the bore is still'),
      alarm: S('Alarm'),
      aria: S('Stealth: how much the guards suspect you'),
      warden: S('Warden: {0}'),
      reckoner: S('Reckoner: {0}'),
      away: S('away'),
      zone: {
        vestry: S('the robing room'), corridor: S('the corridor'), west: S('the west aisle'), mid: S('the middle aisle'), east: S('the east aisle'), strong: S('the strongroom'), back: S('the back stair'),
        floor: S('the counting floor'), gallery: S('the bore gallery'),
      },
    },
    // ---- rumours and the Gazette
    rumour: {
      l: S('They say the Chapel\'s cabinet under the vestry was found open one morning, with six slips of red tape on the floor. The Warden, they say, has asked to be moved.'),
      lNote: S('You took the held letters from the Chapel'),
      lAll: S('Letters are arriving in Oakhaven, they say, in old hands, on old paper, and nobody can say who delivers them. Hetty has been seen smiling. Orla Hale has told three people her granddaughter\'s name.'),
      lAllNote: S('You delivered the six held letters'),
      dR: S('The quarry roster is being recounted, they say, at the Gate, by the sergeant, with a ruler. Nobody has told her to stop.'),
      dRNote: S('You gave the roster to Sergeant Vause'),
      dS: S('The Timber Compact did not cut for a day. The wagons stood in the lane with their shafts down, and the hum went out of the boards. The Consortium has called it an act of weather.'),
      dSNote: S('You gave the roster to the Compact'),
      dM: S('The Reeve-Moot sat late, they say, and the Reeve came out smelling of smoke. Some things, he is reported to have said, are better unread.'),
      dMNote: S('You gave the lease to Reeve Mossbrook'),
      dL: S('A lease was read aloud at the moot, of four hundred and fourteen, in the Governor\'s hand with the Reeve\'s name under it. The moot did not speak. It is reported that the Reeve took it very well.'),
      dLNote: S('You gave the lease to the Compact'),
      gaz: S('The Chapel notes that certain items held on behalf of the public have been returned to the public. The Chapel regrets that it cannot say how.'),
      gazD: S('Depot Three reports that Reconciliation has found no irregularity. Reconciliation has found a door open.'),
    },
    say: {
      closed: S('The matter is closed.'),
      leaveAlarm: S('The way out is open. Go.'),
      noSecond: S('You cannot carry any more.'),
    },
  };

  // ---------------------------------------------------------------- state: flags (validated on every read)
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const hasG = () => typeof G !== 'undefined' && G && G.flags && typeof G.flags === 'object' && !Array.isArray(G.flags);
  const flags = () => (hasG() ? G.flags : {});
  const FLAGS = { // [lo, hi] for small integers, 'b' for true-only booleans
    p16h_l_q: [0, 6], p16h_l_k: [0, 7], p16h_l_ap: [0, 5], p16h_l_al: [0, 2], p16h_l_try: [0, 9], p16h_l_ld: [0, 63], p16h_l_ask: [0, 2],
    p16h_l_br: 'b', p16h_l_fee: 'b', p16h_l_out: 'b', p16h_l_all: 'b', p16h_l_closed: 'b', p16h_l_clean: 'b', p16h_pk_cab: 'b', p16h_pk_box: 'b', p16h_pk_safe: 'b',
    p16h_d_q: [0, 6], p16h_d_k: [0, 7], p16h_d_ap: [0, 5], p16h_d_al: [0, 2], p16h_d_try: [0, 9], p16h_d_ask: [0, 2],
    p16h_d_br: 'b', p16h_d_cash: 'b', p16h_d_out: 'b', p16h_d_closed: 'b', p16h_d_clean: 'b',
    p16h_d_rv: 'b', p16h_d_rs: 'b', p16h_d_lm: 'b', p16h_d_ls: 'b',
  };
  function fint(k) {
    const r = FLAGS[k], v = flags()[k];
    if (!r || r === 'b') return 0;
    return (typeof v === 'number' && Number.isInteger(v) && v >= r[0] && v <= r[1]) ? v : 0;
  }
  function fset(k, v) { const r = FLAGS[k]; if (!r || !hasG()) return; try { G.flags[k] = r === 'b' ? true : Math.max(r[0], Math.min(r[1], Math.floor(v))); } catch (e) { /* a save that cannot hold flags */ } }
  const fbool = (k) => flags()[k] === true;
  function fclear(k) { if (hasG()) try { delete G.flags[k]; } catch (e) { /* ignore */ } }
  function sanitize() {
    if (!hasG()) return;
    for (const k of Object.keys(G.flags)) {
      if (k.indexOf('p16h_') !== 0) continue;
      const r = FLAGS[k], v = G.flags[k];
      if (!r) { delete G.flags[k]; continue; }
      if (r === 'b') { if (v !== true) delete G.flags[k]; }
      else if (!(typeof v === 'number' && Number.isInteger(v) && v >= r[0] && v <= r[1])) delete G.flags[k];
    }
  }

  const stageL = () => fint('p16h_l_q');
  const stageD = () => fint('p16h_d_q');
  const done = (h) => (h === 'L' ? stageL() >= 5 : stageD() >= 5);
  const closed = (h) => fbool(h === 'L' ? 'p16h_l_closed' : 'p16h_d_closed');
  const gone = () => { const f = flags(); return !!(f.greening || f.escaped || f.part3 || f.rite_started); };
  const on = () => cfg.on !== false;
  const active = () => on() && !gone();
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; console.warn('heist16: ' + k + ' failed', e); } };
  const say = (t, c, ms) => { try { if (typeof msg === 'function') msg(t, c || '', ms || 4500); } catch (e) { /* the message line is cosmetic */ } };
  const jrn = (t) => { try { if (typeof journal === 'function' && hasG() && Array.isArray(G.journal)) journal('side', t); } catch (e) { /* no journal yet */ } };
  const hourNow = () => { const t = hasG() && typeof G.tod === 'number' && isFinite(G.tod) ? G.tod : 0.5; return Math.round((((t % 1) + 1) % 1) * 24 * 1e6) / 1e6; };
  const inHours = (h, r) => (r[0] > r[1] ? (h >= r[0] || h < r[1]) : (h >= r[0] && h < r[1]));
  const nightL = () => inHours(hourNow(), B.L_NIGHT);
  const nightD = () => inHours(hourNow(), B.D_NIGHT);
  function sermonLive() { try { return typeof SYNOD15 !== 'undefined' && SYNOD15.sermonNow && SYNOD15.sermonNow() >= 0; } catch (e) { return false; } }
  // why the Chapel's vestry door will open right now: 'bribe' | 'sermon' | 'night' | null
  function windowL() {
    if (!active() || closed('L') || done('L')) return null;
    if (fbool('p16h_l_br')) return 'bribe';
    if (sermonLive()) return 'sermon';
    if (nightL()) return 'night';
    return null;
  }
  function windowD() {
    if (!active() || closed('D') || done('D')) return null;
    if (fbool('p16h_d_br') && nightD()) return 'bribe';
    return nightD() ? 'night' : null;
  }
  const mapOf = (id) => (hasG() && G.maps ? G.maps[id] : null);
  const inV = () => hasG() && G.mapId === MAP_V && G.map && G.map.id === MAP_V;
  const inD = () => hasG() && G.mapId === MAP_D && G.map && G.map.id === MAP_D;
  const inHeist = () => inV() || inD();
  const heistHere = () => (inV() ? 'L' : inD() ? 'D' : null);
  const entsOf = (m) => (m && Array.isArray(m.entities)) ? m.entities : [];
  const wearingRobes = () => { try { return typeof wearingDisguise === 'function' && wearingDisguise() && !disguiseExposed(); } catch (e) { return false; } };

  // ---------------------------------------------------------------- procedural stand-in art (cached once)
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
  // the bore gallery's walls (Phase 16 polish): hewn quarry rock, the drill's scores and a few dull flecks of glass, in place
  // of t_glassrock, whose big flat facets read as a bright yellow slab up close. Periodic noise, so the tile repeats cleanly.
  function paintRock() {
    if (typeof Engine === 'undefined' || !Engine.addTexture || !Engine.textures || Engine.textures.p16h_rock) return;
    const N = 64, d = new Uint32Array(N * N);
    const hsh = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 2246822519) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    const vn = (x, y, cell, s) => {                       // value noise, periodic over the 64-texel tile
      const n = N / cell, fx = x / cell, fy = y / cell, x0 = Math.floor(fx), y0 = Math.floor(fy), u = fx - x0, v = fy - y0;
      const a = hsh(x0 % n, y0 % n, s), b = hsh((x0 + 1) % n, y0 % n, s), c = hsh(x0 % n, (y0 + 1) % n, s), e = hsh((x0 + 1) % n, (y0 + 1) % n, s);
      const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
      return a + (b - a) * su + (c - a) * sv + (a - b - c + e) * su * sv;
    };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const n = vn(x, y, 16, 1) * 0.55 + vn(x, y, 8, 2) * 0.3 + vn(x, y, 4, 3) * 0.15;
      const strata = 0.08 * Math.sin((y + 6 * vn(x, y, 16, 4)) * 0.42);
      let k = 0.62 + 0.55 * n + strata;
      const sc = (x + 3) % 21; if ((sc === 0 || sc === 4) && ((y * 7 + x) % 64) < 40) k *= 0.72;    // paired drill scores, vertical
      if (Math.abs(vn(x, y, 16, 5) - 0.5) < 0.012) k *= 0.6;                                          // hairline cracks
      let r = 84 * k, g = 76 * k, b = 66 * k;
      if (hsh(x, y, 9) > 0.993) { r = 132; g = 128; b = 104; }                                         // a dull fleck of glass
      d[y * N + x] = (255 << 24) | ((Math.min(255, b) | 0) << 16) | ((Math.min(255, g) | 0) << 8) | (Math.min(255, r) | 0);
    }
    Engine.addTexture('p16h_rock', d);
  }
  function paintAll() {
    paintRock();
    reg('p16h_fill', 2, 2, () => {});   // blank: the carrier of a Cinematic fill light, never seen
    // the Held Cabinet: oak, iron corners, a red seal across the doors, paper showing at the crack [PROPOSED]
    reg('p16h_cabinet', 64, 88, (c) => {
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(32, 84, 24, 4, 0, 0, Math.PI * 2); c.fill();
      const g = c.createLinearGradient(0, 4, 0, 84); g.addColorStop(0, '#6a4a2a'); g.addColorStop(1, '#3a2814');
      c.fillStyle = g; c.fillRect(8, 4, 48, 78);
      c.fillStyle = '#2a1c0e'; c.fillRect(31, 4, 2, 78);                                   // the join of the doors
      c.fillStyle = '#7a5a36'; c.fillRect(8, 4, 48, 3); c.fillRect(8, 79, 48, 3);
      c.fillStyle = '#23201c'; for (const [x, y] of [[8, 4], [50, 4], [8, 74], [50, 74]]) c.fillRect(x, y, 6, 8);   // iron corners
      c.fillStyle = '#23201c'; c.fillRect(8, 30, 48, 3); c.fillRect(8, 56, 48, 3);
      c.fillStyle = '#b3402a'; c.beginPath(); c.arc(32, 42, 7, 0, Math.PI * 2); c.fill();   // the seal
      c.fillStyle = '#8a2c1c'; c.fillRect(24, 40, 16, 3);
      c.fillStyle = '#d8c98e'; c.fillRect(33, 10, 5, 3); c.fillRect(25, 64, 6, 2); c.fillRect(34, 70, 4, 2);       // paper at the crack
      c.fillStyle = '#c9a23a'; c.fillRect(36, 46, 3, 5);                                     // the brass tumbler plate
    });
    // the Factor's safe: brass, a dial, VOSK AND CO. [PROPOSED]
    reg('p16h_safe', 56, 64, (c) => {
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(28, 60, 22, 3.5, 0, 0, Math.PI * 2); c.fill();
      const g = c.createLinearGradient(0, 4, 56, 4); g.addColorStop(0, '#8a6a22'); g.addColorStop(0.5, '#c9a23a'); g.addColorStop(1, '#6a4e18');
      c.fillStyle = g; c.fillRect(6, 6, 44, 52);
      c.fillStyle = '#3a2a0e'; c.fillRect(6, 6, 44, 2); c.fillRect(6, 56, 44, 2); c.fillRect(6, 6, 2, 52); c.fillRect(48, 6, 2, 52);
      c.fillStyle = '#4a3410'; c.beginPath(); c.arc(28, 32, 12, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#e8d48a'; c.beginPath(); c.arc(28, 32, 9, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#4a3410'; c.fillRect(27, 24, 2, 9); c.fillRect(24, 31, 8, 2);
      for (const y of [14, 50]) { c.fillStyle = '#3a2a0e'; c.fillRect(10, y, 3, 3); c.fillRect(43, y, 3, 3); }
      c.fillStyle = '#2a1e08'; c.fillRect(16, 10, 24, 3);
    });
  }

  // ---------------------------------------------------------------- items
  const LETTER_IDS = ['lyra', 'kaelen', 'hetty', 'orla', 'pim', 'dessa'];
  const LBIT = { lyra: 1, kaelen: 2, hetty: 4, orla: 8, pim: 16, dessa: 32 };
  const itemId = (k) => 'p16h_letter_' + k;
  const ITEM_DEFS = {};
  for (const k of LETTER_IDS) ITEM_DEFS[itemId(k)] = { name: TX.letters[k].item, sprite: 'loot', use: 'p16h_letter', key: true, value: 0, desc: TX.letters[k].desc };
  ITEM_DEFS.p16h_roster = { name: TX.items.roster, sprite: 'loot', use: 'p16h_doc', key: true, value: 0, desc: TX.items.rosterDesc };
  ITEM_DEFS.p16h_lease = { name: TX.items.lease, sprite: 'loot', use: 'p16h_doc', key: true, value: 0, desc: TX.items.leaseDesc };
  function installItems() {
    if (typeof ITEMS !== 'undefined') for (const k in ITEM_DEFS) if (!ITEMS[k]) ITEMS[k] = ITEM_DEFS[k];
    try {
      if (typeof ICONS !== 'undefined' && ICONS.TABLE) {
        for (const k of LETTER_IDS) ICONS.TABLE[itemId(k)] = ['letter', {}];
        ICONS.TABLE.p16h_roster = ['book', { cov: '#5a5e66', band: '#c9a23a' }];
        ICONS.TABLE.p16h_lease = ['scroll', { paper: '#e0d2a4', ink: '#6a2a1c' }];
      }
    } catch (e) { /* icon fallback */ }
    try { if (typeof ITEM_WEIGHTS !== 'undefined') { for (const k in ITEM_DEFS) if (ITEM_WEIGHTS[k] == null) ITEM_WEIGHTS[k] = 0.1; } } catch (e) { /* weights optional */ }
  }
  const hasLetter = (k) => { try { return G.has(itemId(k)); } catch (e) { return false; } };
  const lettersHeld = () => LETTER_IDS.filter(hasLetter);
  const delivered = (k) => (fint('p16h_l_ld') & LBIT[k]) !== 0;
  const deliveredCount = () => LETTER_IDS.filter(delivered).length;

  // ---------------------------------------------------------------- the maps: ASCII-free, built from rectangles
  // Every inner passage is an open archway (guards cannot open doors), so a BFS from the spawn reaches every room, and the
  // only door cells are the exits.
  function newGrid(w, h) { const g = []; for (let y = 0; y < h; y++) g.push(new Array(w).fill('#')); return g; }
  function carve(g, x0, y0, x1, y1, ch) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = ch || '.'; }

  // the vestry and undercroft, 28 x 17 [PROPOSED]
  //   robing room x1-8 y10-15 | back stair x4 y5-9 then y5 x3-10 (dark) | archive hall x12-25 y1-9 with two long shelf walls
  //   (x16 y1-6, x21 y4-9) so the aisles snake | corridor x10-26 y11-12 | the sexton's strongroom x19-26 y14-15
  const V = {
    W: 28, H: 17, SPAWN: { x: 1.5, y: 12.5, dir: 0 }, EXIT: [0, 12],
    CAB: [23.6, 1.5], BOX: [25.4, 14.6], HATCH: [3.5, 5.5],
    LAMPS: [[2.2, 10.7], [12.6, 2.0], [20.5, 8.6], [25.4, 8.6], [17.5, 11.2]],
    // the Warden's round: [x, y, wait seconds, facing after the wait]
    ROUTE: [[11.6, 11.5, 4], [24.5, 11.5, 0], [24.5, 5.0, 0], [23.6, 2.9, 5], [21.5, 2.0, 0], [18.5, 2.0, 0], [18.5, 8.3, 0], [14.5, 8.3, 0], [13.5, 3.0, 3], [13.5, 8.8, 0], [13.5, 11.5, 0]],
    START: 8,
  };
  function buildVestry() {
    const g = newGrid(V.W, V.H);
    carve(g, 12, 1, 25, 9);                                 // the archive hall
    for (let y = 1; y <= 6; y++) g[y][16] = 'W';            // the long shelf walls
    for (let y = 4; y <= 9; y++) g[y][21] = 'W';
    carve(g, 11, 5, 11, 5); carve(g, 13, 10, 13, 10); carve(g, 24, 10, 24, 10);   // west gap, two south gaps
    carve(g, 10, 11, 26, 12);                               // the corridor
    carve(g, 1, 10, 8, 15); carve(g, 9, 12, 9, 12);         // the robing room and its gap
    carve(g, 4, 9, 4, 9); carve(g, 4, 5, 4, 8); carve(g, 3, 5, 10, 5);   // the back stair
    carve(g, 19, 14, 26, 15); carve(g, 22, 13, 22, 13);     // the sexton's strongroom
    const m = new GameMap(MAP_V, TX.names.mapV, V.W, V.H, { floor: 't_flag', ceil: 't_stone', fogDist: 14, ambient: 0.17, fogColor: [0, 0, 0], music: 'cloister', spawn: V.SPAWN });
    for (let y = 0; y < V.H; y++) for (let x = 0; x < V.W; x++) {
      const ch = g[y][x];
      if (ch === '#') m.set(x, y, WALL(x <= 9 && y >= 9 ? 't_marble' : 't_stone'));
      else if (ch === 'W') m.set(x, y, WALL('t_wood'));
    }
    m.set(V.EXIT[0], V.EXIT[1], DOOR({ portal: { map: 'chapel', x: 1.7, y: 3.5, dir: 0 }, label: TX.look.exit }));
    const look = (sprite, x, y, k, o) => m.add(Object.assign({ kind: 'deco', sprite, x, y, solid: true, radius: 0.3, use: 'p16h_use', _k: k, label: TX.look[k] || '' }, o || {}));
    for (const [x, y] of V.LAMPS) look('lamp', x, y, 'lamp', { radius: 0.12, scale: 0.7, glow: 0.65, _lamp: true, solid: false });
    look('cloaks', 6.9, 10.5, 'robes', { radius: 0.25, scale: 0.8 });
    look('shelf', 1.4, 14.6, 'shelf', { radius: 0.2, scale: 0.9 });
    look('table', 5.6, 14.3, 'table', { radius: 0.5, scale: 0.7 });
    look('ladder', V.HATCH[0], V.HATCH[1], 'hatch', { solid: false, scale: 0.9, radius: 0.2, label: TX.look.hatch });
    look('shelf', 12.3, 3.6, 'pig1', { radius: 0.2, scale: 0.95 });
    look('shelf', 12.3, 7.6, 'pig2', { radius: 0.2, scale: 0.95 });
    look('shelf', 17.4, 3.4, 'pig3', { radius: 0.2, scale: 0.95 });
    look('shelf', 25.6, 5.4, 'pig4', { radius: 0.2, scale: 0.95 });
    look('table', 22.8, 8.2, 'rack', { radius: 0.4, scale: 0.6 });
    look('p16h_cabinet', V.CAB[0], V.CAB[1], 'cab', { radius: 0.4, scale: 0.95, label: TX.look.cabinet });
    look('chest', V.BOX[0], V.BOX[1], 'box', { radius: 0.3, scale: 0.6, label: TX.look.box });
    look('bed', 20.3, 14.7, 'cot', { radius: 0.4, scale: 0.5 });
    m.baseCount = m.entities.length;
    return m;
  }

  // Depot Three, 30 x 18 [PROPOSED]
  //   counting floor x1-12 y1-8 | bore gallery x14-28 y1-8 (arch at (13,4)) | corridor x1-28 y10-11 | ledger room x1-11 y13-16
  //   | strongroom x18-28 y13-16 (a brass screen at x22 y13-14: Pike keeps the east half, the safe is in the dark west half);
  //   arches at (6,9), (22,9), (6,12), (19,12)
  const D = {
    W: 30, H: 18, SPAWN: { x: 1.5, y: 10.6, dir: 0 }, EXIT: [0, 10],
    SAFE: [18.7, 14.6], HATCH: [28.4, 5.0], BORE: [19.5, 4.5],
    LAMPS: [[11.0, 5.6], [26.6, 7.4], [14.0, 10.2], [24.0, 10.2], [26.4, 13.5]],
    ROUTE_R: [[3.0, 10.6, 3], [6.5, 10.6, 0], [6.5, 6.2, 0], [6.5, 2.6, 6], [6.5, 8.2, 0], [6.5, 10.6, 0], [14.5, 10.6, 0], [22.5, 10.6, 0], [22.5, 6.5, 0], [22.5, 2.5, 4], [22.5, 8.4, 0], [22.5, 10.6, 0], [27.5, 10.6, 3], [14.5, 10.6, 0]],
    ROUTE_P: [[23.8, 14.5, 5], [27.0, 14.5, 5]],
    START_R: 9,
  };
  function buildDepot() {
    const g = newGrid(D.W, D.H);
    carve(g, 1, 1, 12, 8); carve(g, 14, 1, 28, 8); carve(g, 13, 4, 13, 4);
    carve(g, 1, 10, 28, 11); carve(g, 6, 9, 6, 9); carve(g, 22, 9, 22, 9);
    carve(g, 1, 13, 11, 16); carve(g, 6, 12, 6, 12);
    carve(g, 18, 13, 28, 16); carve(g, 19, 12, 19, 12);
    g[13][22] = 'B'; g[14][22] = 'B';                       // the brass screen: Pike keeps the east half, the safe is in the dark west half
    const m = new GameMap(MAP_D, TX.names.mapD, D.W, D.H, { floor: 't_flag', ceil: 't_stone', fogDist: 14, ambient: 0.17, fogColor: [0, 0, 0], music: 'dungeon', spawn: D.SPAWN });
    for (let y = 0; y < D.H; y++) for (let x = 0; x < D.W; x++) {
      if (g[y][x] === '#') m.set(x, y, WALL(x >= 14 && y <= 9 ? (Engine.textures && Engine.textures.p16h_rock ? 'p16h_rock' : 't_glassrock') : (x >= 17 && y >= 12) ? 't_brass' : 't_stone'));
      else if (g[y][x] === 'B') m.set(x, y, WALL('t_brass'));
    }
    m.set(D.EXIT[0], D.EXIT[1], DOOR({ portal: { map: 'quarry', x: 31.3, y: 6.5, dir: Math.PI }, label: TX.look2.exit }));
    const look = (sprite, x, y, k, o) => m.add(Object.assign({ kind: 'deco', sprite, x, y, solid: true, radius: 0.3, use: 'p16h_use', _k: k, label: TX.look2[k] || '' }, o || {}));
    for (const [x, y] of D.LAMPS) look('lamp', x, y, 'lamp', { radius: 0.12, scale: 0.7, glow: 0.65, _lamp: true, solid: false });
    look('table', 3.5, 3.5, 'desks', { radius: 0.5, scale: 0.7 });
    look('table', 3.5, 6.0, 'desks', { radius: 0.5, scale: 0.7 });
    look('table', 8.0, 3.5, 'desks', { radius: 0.5, scale: 0.7 });
    look('table', 8.0, 6.0, 'desks', { radius: 0.5, scale: 0.7 });
    look('table', 10.9, 2.0, 'desk', { radius: 0.5, scale: 0.7 });
    look('bore', D.BORE[0], D.BORE[1], 'bore', { radius: 0.9, scale: 2.2, glow: 0.5 });
    look('pump', 16.0, 2.0, 'pumps', { radius: 0.4 }); look('pump', 16.0, 7.0, 'pumps', { radius: 0.4 }); look('pump', 26.0, 2.0, 'pumps', { radius: 0.4 });
    look('ladder', D.HATCH[0], D.HATCH[1], 'hatch', { solid: false, scale: 0.9, radius: 0.2, label: TX.look2.hatch });
    look('shelf', 1.4, 14.5, 'tally', { radius: 0.2, scale: 0.95 });
    look('sign', 11.6, 14.6, 'unnumbered', { radius: 0.2, scale: 0.9 });
    look('table', 6.0, 15.0, 'reconcile', { radius: 0.5, scale: 0.7 });
    look('p16h_safe', D.SAFE[0], D.SAFE[1], 'safe', { radius: 0.4, scale: 0.95, label: TX.look2.safe });
    m.deco('crates', 27.3, 15.3, { radius: 0.35 });
    m.baseCount = m.entities.length;
    return m;
  }

  // BFS over a built map (doors and archways passable): which cells can you reach from (sx, sy)?
  function reach(m, sx, sy) {
    const seen = new Set(), q = [[sx | 0, sy | 0]]; seen.add((sx | 0) + ',' + (sy | 0));
    const pass = (x, y) => { const c = m.get(x, y); return !c || !!c.door; };
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
        if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h || seen.has(k) || !pass(nx, ny)) continue;
        seen.add(k); q.push([nx, ny]);
      }
    }
    return seen;
  }

  // zone names for the badge
  function zoneV(x, y) {
    if (x < 9.5 && y >= 9.5) return 'vestry';
    if (x < 11 && y < 9.5) return 'back';
    if (y >= 13.2) return 'strong';
    if (y >= 10.2) return 'corridor';
    if (x < 16) return 'west';
    if (x < 21) return 'mid';
    return 'east';
  }
  function zoneD(x, y) {
    if (y >= 12 && x >= 17) return 'strong';
    if (y >= 9.5 && y < 12) return 'corridor';
    if (y < 9.5 && x < 13) return 'floor';
    if (y < 9.5) return 'gallery';
    return 'floor';
  }

  // ---------------------------------------------------------------- runtime state (transient: never saved)
  const T = {
    clock: 0, bore: 16, alarm: null, alarmT: 0, reinfDone: false, watchDone: false, away: { warden: 0, pike: 0 }, awayPending: 0,
    sus: 0, lit: false, collar: false, collarPending: false, badgeT: 0, doorT: 0, said: {}, tries: 0,
  };

  // ---------------------------------------------------------------- the new people (kind 'npc', transient)
  const NPC_IDS = { dessa: 'p16h_dessa', orrin: 'p16h_orrin', steward: 'p16h_steward', vause: 'p16h_vause', mossbrook: 'p16h_mossbrook', ines: 'p16h_ines' };
  function learn(h, bit) {
    const kk = h === 'L' ? 'p16h_l_k' : 'p16h_d_k', qk = h === 'L' ? 'p16h_l_q' : 'p16h_d_q', before = fint(kk);
    if (!(before & bit)) fset(kk, before | bit);
    const q = fint(qk);
    if (q >= 1 && q <= 2) {
      if (fint(kk) === 7 && q < 2) { fset(qk, 2); jrn(h === 'L' ? TX.l.j.planned : TX.d.j.planned); }
    }
  }
  function hook(h) {
    const qk = h === 'L' ? 'p16h_l_q' : 'p16h_d_q';
    if (fint(qk) >= 1) return;
    fset(qk, 1); jrn(h === 'L' ? TX.l.j.offer : TX.d.j.offer);
    if (fint(h === 'L' ? 'p16h_l_k' : 'p16h_d_k') === 7) { fset(qk, 2); jrn(h === 'L' ? TX.l.j.planned : TX.d.j.planned); }
  }
  // a conversation that offers what is not yet known, and keeps offering it after each answer
  function followUp() { setTimeout(() => { try { if (typeof G !== 'undefined' && G.openPanel === 'dialogue' && typeof DLG !== 'undefined' && DLG.choices && DLG.choices.length) renderDialogue('choice'); } catch (e) { /* closed */ } }, 0); }
  function askChoices(h) {
    const T_ = h === 'L' ? TX.dessa : TX.steward, kk = h === 'L' ? 'p16h_l_k' : 'p16h_d_k', out = [];
    const item = (bit, label, reply) => { if (!(fint(kk) & bit)) out.push({ t: label, f: () => { learn(h, bit); const more = askChoices(h); try { DLG.choices = more.length ? more : null; } catch (e) { /* none */ } if (more.length) followUp(); return reply; } }); };
    if (h === 'L') { item(1, T_.qRoute, T_.route); item(2, T_.qWindow, T_.window); item(4, T_.qKeys, T_.keys); }
    else { item(1, T_.qRoute, T_.route); item(2, T_.qBell, T_.bell); item(4, T_.qSafe, T_.safe); }
    return out;
  }
  function guide(h) {
    const T_ = h === 'L' ? TX.dessa : TX.steward, q = h === 'L' ? stageL() : stageD(), ask = fint(h === 'L' ? 'p16h_l_ask' : 'p16h_d_ask');
    const askKey = h === 'L' ? 'p16h_l_ask' : 'p16h_d_ask';
    if (!active() || closed(h)) return { text: T_.closed };
    const extra = [];
    if (h === 'L' && hasLetter('dessa') && !delivered('dessa')) extra.push({ t: T_.deliver, f: () => deliverLetter('dessa') });
    if (h === 'D' && lettersHeldD().length) for (const d of lettersHeldD()) extra.push({ t: d.label, f: () => { handOver(d.code); return TX.steward[d.code]; } });
    if (q >= 5) {
      const gaveAny = h === 'L' ? deliveredCount() > 0 : (fbool('p16h_d_rv') || fbool('p16h_d_rs') || fbool('p16h_d_lm') || fbool('p16h_d_ls'));
      return { text: gaveAny && (h === 'D' || deliveredCount() === 6) ? T_.done : T_.out, choices: extra.length ? extra : null };
    }
    if (q === 0) {
      return { text: ask ? T_.again : T_.intro, choices: [
        { t: T_.yes, f: () => { fset(askKey, 2); hook(h); const more = askChoices(h); try { DLG.choices = more.length ? more : null; } catch (e) { /* none */ } if (more.length) followUp(); return T_.accept; } },
        { t: T_.no, f: () => { fset(askKey, 1); return T_.declined; } },
      ] };
    }
    const more = askChoices(h);
    if (!more.length) return { text: T_.planned, choices: extra.length ? extra : null };
    return { text: T_.waiting, choices: more.concat(extra) };
  }
  // the roster / the lease, held (for the steward's hand-over choices)
  function lettersHeldD() {
    const out = [];
    if (hasDoc('roster') && !fbool('p16h_d_rv') && !fbool('p16h_d_rs')) out.push({ code: 'rs', label: TX.steward.giveRoster });
    if (hasDoc('lease') && !fbool('p16h_d_lm') && !fbool('p16h_d_ls')) out.push({ code: 'ls', label: TX.steward.giveLease });
    return out;
  }
  const hasDoc = (k) => { try { return G.has('p16h_' + k); } catch (e) { return false; } };

  function orrinQuest() {
    const O = TX.orrin;
    if (!active()) return null;
    if (closed('L') || done('L')) return { text: deliveredCount() > 0 || fbool('p16h_l_out') ? O.done : O.hook };
    if (fbool('p16h_l_br')) return { text: O.after };
    if (stageL() < 1) return { text: O.hook };
    learn('L', 4);
    return { text: O.keysKnown, choices: [
      { t: O.pay, f: () => payOrrin() },
      { t: O.noPay, f: () => O.noPay },
    ] };
  }
  function payOrrin() {
    const O = TX.orrin;
    if (!hasG() || !active() || fbool('p16h_l_br')) return O.after;
    if (!(Number(G.player.gold) >= B.L_BRIBE)) return O.poor;
    G.player.gold -= B.L_BRIBE;
    fset('p16h_l_br', true);
    G.flags['picked:chapel:door:0:3'] = true;                 // the key is in the lock: the game's own flag for a picked mechanical door
    syncDoors();
    return O.paid;
  }
  function inesQuest() {
    const I = TX.ines;
    if (!active()) return null;
    if (fbool('p16h_d_br')) return { text: I.after };
    if (stageD() < 1) return null;
    learn('D', 4);
    return { text: I.safeKnown, choices: [
      { t: I.pay, f: () => payInes() },
      { t: I.noPay, f: () => I.noPay },
    ] };
  }
  function payInes() {
    const I = TX.ines;
    if (!hasG() || !active() || fbool('p16h_d_br')) return I.after;
    if (!(Number(G.player.gold) >= B.D_BRIBE)) return I.poor;
    G.player.gold -= B.D_BRIBE;
    fset('p16h_d_br', true);
    if (fint('p16h_d_ap') !== 3) fset('p16h_d_ap', 2);
    awayStart('pike', B.D_AWAY);
    return I.paid;
  }
  function vauseQuest() {
    const Vz = TX.vause;
    if (!active()) return { text: Vz.closed };
    const choices = [];
    if (hasDoc('roster') && !fbool('p16h_d_rv') && !fbool('p16h_d_rs')) choices.push({ t: Vz.give, f: () => { handOver('rv'); return Vz.rv; } });
    if (fbool('p16h_d_rv')) return { text: Vz.done };
    return { text: Vz.notice, choices: choices.length ? choices : null };
  }
  function mossbrookQuest() {
    const M = TX.mossbrook;
    if (!active()) return { text: M.closed };
    if (fbool('p16h_d_lm')) return { text: M.done };
    const choices = [];
    if (hasDoc('lease') && !fbool('p16h_d_lm') && !fbool('p16h_d_ls')) choices.push({ t: M.give, f: () => { handOver('lm'); return M.lm; } });
    return { text: M.notice, choices: choices.length ? choices : null };
  }

  const NPC_DEFS = {
    p16h_dessa: { name: TX.names.dessa, sprite: 'townswoman', portrait: 'townswoman', tier: 'low', greet: TX.dessa.greet, topics: {}, quest: () => guide('L') },
    p16h_orrin: { name: TX.names.orrin, sprite: 'townsman', portrait: 'townsman', tier: 'low', greet: TX.orrin.greet, topics: {}, quest: orrinQuest },
    p16h_steward: { name: TX.names.steward, sprite: 'townsman', portrait: 'townsman', tier: 'low', greet: TX.steward.greet, topics: {}, quest: () => guide('D') },
    p16h_vause: { name: TX.names.vause, sprite: 'proctor', portrait: 'proctor', tier: 'low', greet: TX.vause.greet, topics: {}, quest: vauseQuest },
    p16h_mossbrook: { name: TX.names.mossbrook, sprite: 'townsman', portrait: 'townsman', tier: 'low', greet: TX.mossbrook.greet, topics: {}, quest: mossbrookQuest },
    p16h_ines: { name: TX.names.ines, sprite: 'townswoman', portrait: 'townswoman', tier: 'low', greet: TX.ines.greet, topics: {}, quest: inesQuest },
  };
  function installNpc() { if (typeof NPCS !== 'undefined') for (const k in NPC_DEFS) if (!NPCS[k]) NPCS[k] = NPC_DEFS[k]; }

  // ---------------------------------------------------------------- what stands where (transient entities)
  function find(m, key) { return entsOf(m).find((e) => e && e._p16h === key); }
  function drop(m, key) { const a = entsOf(m); for (let i = a.length - 1; i >= 0; i--) if (a[i] && a[i]._p16h === key) a.splice(i, 1); }
  function put(m, key, make) {
    let e = find(m, key);
    if (e) return e;
    e = Object.assign(make(), { transient: true, _decor: true, _p16h: key });
    if (e.kind === 'npc') { e._h = true; e.homeX = e.x; e.homeY = e.y; e.wanderT = 1e9; e.dir = e.facing || 0; }   // no dice: the shared random stream stays as it was
    m.entities.push(e);
    return e;
  }
  function nearFree(m, x, y) {
    const free = (px, py) => !m.isBlocked(px | 0, py | 0) && !entsOf(m).some((o) => o && o.solid && !o.dead && (o.x - px) ** 2 + (o.y - py) ** 2 < 0.8);
    if (free(x, y)) return [x, y];
    for (let k = 1; k <= 10; k++) for (let a = 0; a < 8; a++) { const px = x + Math.cos(a * Math.PI / 4) * k * 0.45, py = y + Math.sin(a * Math.PI / 4) * k * 0.45; if (free(px, py)) return [px, py]; }
    return [x, y];
  }
  const realOak = (m) => m && m.id === 'oakhaven' && m.w === 70 && m.h === 64;
  const realChapel = (m) => m && m.id === 'chapel' && m.w === 13 && m.h === 13;
  const realClearing = (m) => m && m.id === 'clearing' && m.w === 40 && m.h === 36;
  const realHall = (m) => m && m.id === 'greenhall' && m.w === 17 && m.h === 12;
  const realQuarry = (m) => m && m.id === 'quarry' && m.w === 44 && m.h === 44 && m.named && m.named.depot;
  const person = (id, x, y, sprite, facing, o) => Object.assign({ kind: 'npc', id, x, y, sprite, scale: 1, solid: true, radius: 0.35, facing }, o || {});
  function ensure(m) {
    if (!m) return;
    const live = active();
    if (realOak(m)) {
      if (live) { const a = nearFree(m, 50.4, 10.8); put(m, 'dessa', () => person(NPC_IDS.dessa, a[0], a[1], 'townswoman', -Math.PI / 2)); } else drop(m, 'dessa');
    } else if (realChapel(m)) {
      if (live) {
        const a = nearFree(m, 1.7, 5.9);
        put(m, 'orrin', () => person(NPC_IDS.orrin, a[0], a[1], 'townsman', 0));
        put(m, 'cboard', () => ({ kind: 'deco', sprite: 'hymnboard', x: 2.6, y: 1.35, scale: 0.8, solid: false, radius: 0.2, use: 'p16h_use', _k: 'cboard', label: TX.chapel.boardLabel || '' }));
      } else { drop(m, 'orrin'); drop(m, 'cboard'); }
    } else if (realClearing(m)) {
      if (live) {
        const a = nearFree(m, 19.4, 29.4), b = nearFree(m, 23.4, 5.9);
        put(m, 'steward', () => person(NPC_IDS.steward, a[0], a[1], 'townsman', Math.PI / 2));
        put(m, 'vause', () => person(NPC_IDS.vause, b[0], b[1], 'proctor', Math.PI / 2));
      } else { drop(m, 'steward'); drop(m, 'vause'); }
    } else if (realHall(m)) {
      if (live) { const a = nearFree(m, 4.2, 4.0); put(m, 'moss', () => person(NPC_IDS.mossbrook, a[0], a[1], 'townsman', 0)); } else drop(m, 'moss');
    } else if (realQuarry(m)) {
      if (live) put(m, 'qboard', () => ({ kind: 'deco', sprite: 'sign', x: 26.6, y: 7.9, scale: 0.8, solid: false, radius: 0.2, use: 'p16h_use', _k: 'qboard', label: TX.d.boardLabel || '' }));
      else drop(m, 'qboard');
    } else if (m.id === MAP_D && m.w === D.W) {
      if (live) put(m, 'ines', () => person(NPC_IDS.ines, 10.2, 3.0, 'townswoman', -Math.PI / 2, { name: TX.ines.name }));
      else drop(m, 'ines');
      const ines = find(m, 'ines'); if (ines) ines.hidden = fbool('p16h_d_br') && T.away.pike > 0;
    }
  }
  // Cinematic only (Phase 16 polish): its indoor depth haze and contrast take the vestry and the depot from dark to black.
  // A few unseen, dim fill lights (transient, unpickable, blank sprite, lightCol) keep walls and furniture readable there.
  // They carry no _lamp, so the guards' sight (litLamps / isLit) is untouched; Medium and Original get none.
  const FILL_COL = [15, 12, 9];
  const FILLS = {
    p16h_vestry: [[14.0, 3.0], [19.0, 3.0], [23.8, 3.4], [18.6, 7.6], [24.0, 7.2], [13.0, 11.5], [19.0, 11.6], [23.0, 14.6], [4.6, 12.6], [6.0, 5.5]],
    p16h_depot3: [[4.0, 4.5], [9.5, 4.5], [17.5, 4.5], [24.5, 4.5], [8.0, 10.6], [18.0, 10.6], [5.5, 14.6], [20.5, 14.6], [25.5, 14.6]],
  };
  const cineOn = () => typeof GFX !== 'undefined' && (GFX.cineFog === true || GFX.cineGrade === true);
  function syncFill() {
    if (!hasG() || !G.maps) return;
    const want = cineOn();
    for (const id in FILLS) {
      const m = G.maps[id]; if (!m || !Array.isArray(m.entities)) continue;
      const have = m.entities.some((e) => e && e._p16hFill);
      if (have === want) continue;
      if (want) for (const [x, y] of FILLS[id]) m.entities.push({ kind: 'deco', sprite: 'p16h_fill', x, y, solid: false, radius: 0.05, nopick: true, transient: true, lightCol: FILL_COL, _p16hFill: true });
      else for (let i = m.entities.length - 1; i >= 0; i--) if (m.entities[i] && m.entities[i]._p16hFill) m.entities.splice(i, 1);
    }
  }
  function syncAll() {
    if (!hasG() || !G.maps) return;
    try { syncFill(); } catch (e) { warnOnce('fill', e); }
    try { for (const id in G.maps) ensure(G.maps[id]); } catch (e) { warnOnce('sync', e); }
    try { syncDoors(); } catch (e) { warnOnce('doors', e); }
    try { syncProps(); } catch (e) { warnOnce('props', e); }
    try { syncGivers(); } catch (e) { warnOnce('givers', e); }
  }
  function syncGivers() {
    const arr = (typeof LOGMAP !== 'undefined' && LOGMAP && Array.isArray(LOGMAP.QUEST_GIVERS)) ? LOGMAP.QUEST_GIVERS : null;
    if (!arr) return;
    const want = { p16h_dessa: active() && !closed('L') && stageL() < 5, p16h_steward: active() && !closed('D') && stageD() < 5 };
    for (const id in want) { const i = arr.indexOf(id); if (want[id] && i < 0) arr.push(id); else if (!want[id] && i >= 0) arr.splice(i, 1); }
  }

  // ---------------------------------------------------------------- the two doors
  function cellAt(m, x, y) { if (!m || typeof m.get !== 'function') return null; const c = m.get(x, y); return (c && c.door) ? c : null; }
  function depotDoorAt(q) { const d = q && q.named && q.named.depot; return d ? [d.x + d.w, d.y + d.h - 1] : null; }
  function syncDoors() {
    if (!hasG() || !G.maps) return;
    const ch = G.maps.chapel, qa = G.maps.quarry;
    if (realChapel(ch)) {
      const c = cellAt(ch, 0, 3);
      if (c) {
        if (!c._p16h) c._p16h = true;
        const w = windowL();
        c.portal = { map: MAP_V, x: V.SPAWN.x, y: V.SPAWN.y, dir: V.SPAWN.dir };
        if (w) { delete c.locked; delete c.lockMsg; c.lockDifficulty = 2; c.label = TX.chapel.doorLabel; }
        else {
          c.locked = '__never'; delete c.lockDifficulty;
          c.lockMsg = (active() && !closed('L') && !done('L')) ? TX.chapel.doorShut : TX.chapel.doorGone; c.label = TX.chapel.doorLabelShut;
        }
        if (!active() || closed('L')) c.label = TX.chapel.doorLabelShut;
      }
    }
    if (realQuarry(qa)) {
      const at = depotDoorAt(qa), c = at && cellAt(qa, at[0], at[1]);
      if (c) {
        const w = windowD();
        c.portal = { map: MAP_D, x: D.SPAWN.x, y: D.SPAWN.y, dir: D.SPAWN.dir };
        if (w) { delete c.locked; delete c.lockMsg; c.lockDifficulty = 2; c.label = TX.d.doorLabel; }
        else {
          c.locked = '__never'; delete c.lockDifficulty;
          c.lockMsg = (active() && !closed('D') && !done('D')) ? TX.d.doorShut : TX.d.doorGone; c.label = TX.d.doorLabelShut;
        }
      }
    }
  }
  // the doors are built (once) when the world is
  function addDoors(maps) {
    const ch = maps.chapel, qa = maps.quarry;
    if (realChapel(ch) && !cellAt(ch, 0, 3) && !ch.get(0, 3).door) ch.set(0, 3, DOOR({ portal: { map: MAP_V, x: V.SPAWN.x, y: V.SPAWN.y, dir: V.SPAWN.dir }, locked: '__never', lockMsg: TX.chapel.doorShut, label: TX.chapel.doorLabelShut }));
    if (realQuarry(qa)) {
      const at = depotDoorAt(qa);
      if (at) { const c = qa.get(at[0], at[1]); if (c && !c.door && c.tex) qa.set(at[0], at[1], DOOR({ portal: { map: MAP_D, x: D.SPAWN.x, y: D.SPAWN.y, dir: D.SPAWN.dir }, locked: '__never', lockMsg: TX.d.doorShut, label: TX.d.doorLabelShut })); }
    }
  }

  // ---------------------------------------------------------------- the guards
  const ROUTE_NAMES = { warden: { type: 'proctor', name: TX.names.warden }, reckoner: { type: 'proctor', name: TX.names.reckoner }, pike: { type: 'legionnaire', name: TX.names.pike } };
  function makeGuard(m, key, kind, route, start, speed) {
    const w = route[start], nx = route[(start + 1) % route.length];
    const spec = ROUTE_NAMES[kind];
    const e = hydrate({ kind: 'enemy', type: spec.type, name: spec.name, guard: true, x: w[0], y: w[1] });
    e.transient = true; e._p16h = key; e.facing = Math.atan2(nx[1] - w[1], nx[0] - w[0]);
    e._pa = { route, i: (start + 1) % route.length, wait: 0, sus: 0, speed, kind, away: 0, stuck: 0, t: 0, startAt: start };
    m.entities.push(e);
    return e;
  }
  function removeGuards(m) { const a = entsOf(m); for (let i = a.length - 1; i >= 0; i--) if (a[i] && a[i]._pa) a.splice(i, 1); }
  const guardsOf = () => (hasG() ? G.ents.filter((e) => e && e._pa && !e.dead) : []);
  function spawnGuards(m, h) {
    removeGuards(m);
    if (h === 'L') makeGuard(m, 'warden', 'warden', V.ROUTE, V.START, B.SPEED);
    else { makeGuard(m, 'reckoner', 'reckoner', D.ROUTE_R, D.START_R, B.SPEED); makeGuard(m, 'pike', 'pike', D.ROUTE_P, 0, 0.9); }
  }
  function awayStart(who, secs) {
    T.away[who] = secs;
    const ines = who === 'pike' ? find(G.map, 'ines') : null; if (ines) ines.hidden = true;
  }
  // a guard who is "away" (at supper, with the deacon, gone for tea) walks out of sight and is gone until he may come back
  const unseenBy = (e, far) => { const c = Engine.cam, d = Math.hypot(c.x - e.x, c.y - e.y); return d > far || !los(e.x, e.y, c.x, c.y); };
  function awayEnd(e) {
    const pa = e._pa, w = pa.route[pa.startAt];
    e.hidden = false; e.x = w[0]; e.y = w[1]; pa.i = (pa.startAt + 1) % pa.route.length; pa.wait = 0; pa.sus = 0; e.state = 'idle';
    const ines = find(G.map, 'ines'); if (ines) ines.hidden = false;
  }
  let lampCache = { t: -1, key: null, list: [] };
  function lampsNow() {
    const t = hasG() ? G.time : 0;
    if (lampCache.t !== t || lampCache.key !== G.map) lampCache = { t, key: G.map, list: litLamps() };
    return lampCache.list;
  }
  function litLamps() { return hasG() ? G.ents.filter((e) => e && e._lamp && e.glow > 0 && !e.hidden) : []; }
  function isLit(x, y, lamps) {
    const r2 = B.LAMP_R * B.LAMP_R;
    for (const l of (lamps || litLamps())) if ((l.x - x) ** 2 + (l.y - y) ** 2 < r2) return true;
    return false;
  }
  const boreOn = () => (T.bore % B.BORE_PERIOD) < B.BORE_GRIND;
  function effNoise() {
    let n = Number(G.noise); if (!isFinite(n)) n = 2;
    if (inV() && sermonLive()) n = Math.min(n, B.HYMN_NOISE);
    if (inD() && boreOn()) n = Math.min(n, B.BORE_NOISE);
    try { if (typeof KIT12 !== 'undefined' && KIT12.playerSilent && KIT12.playerSilent()) n = Math.min(n, 0.2); } catch (err) { /* no jar */ }
    return n;
  }
  const silenced = (e) => { try { return typeof KIT12 !== 'undefined' && KIT12.zones && KIT12.zones.length > 0 && KIT12.inSilence(e.x, e.y); } catch (err) { return false; } };

  // a guard senses you: sight in a cone (range depends on the light), a bump, and sound. Returns the suspicion gained per second.
  function senseGain(e) {
    const c = Engine.cam, dx = c.x - e.x, dy = c.y - e.y, d = Math.hypot(dx, dy);
    if (d > B.RANGE_LIT + 0.5) return 0;
    const lit = isLit(c.x, c.y, lampsNow()), range = lit ? B.RANGE_LIT : B.RANGE_DARK;
    T.lit = lit;
    const noise = effNoise();
    if (!(d < range) || !los(e.x, e.y, c.x, c.y)) return 0;
    const ang = Math.abs(normAng(Math.atan2(c.y - e.y, c.x - e.x) - (Number.isFinite(e.facing) ? e.facing : 0)));
    if (d < B.BUMP) return B.GAIN_BUMP;
    if (ang >= B.HALF_CONE) return 0;
    return Math.max(0.15, B.GAIN * (1.15 - d / range)) * (1 + B.NOISE_MULT * Math.max(0, noise - 2.4));
  }
  function hears(e) {
    if (silenced(e)) return false;
    const noise = effNoise(); if (noise < B.HEAR_AT) return false;
    const c = Engine.cam, d = Math.hypot(c.x - e.x, c.y - e.y);
    return d < (noise - 2.2) * B.HEAR_K;
  }
  function patrolStep(e, dt) {
    const pa = e._pa;
    pa.t += dt;
    if (pa.wait > 0) {
      pa.wait -= dt;
      e.facing = (pa.baseFace == null ? (Number.isFinite(e.facing) ? e.facing : 0) : pa.baseFace) + Math.sin(pa.t * 1.3) * 0.45;   // looking about
      return;
    }
    const w = pa.route[pa.i], dx = w[0] - e.x, dy = w[1] - e.y, d = Math.hypot(dx, dy);
    if (d < 0.3) { pa.wait = w[2] || 0; pa.baseFace = e.facing; pa.i = (pa.i + 1) % pa.route.length; pa.stuck = 0; return; }
    e.facing = Math.atan2(dy, dx); pa.baseFace = e.facing;
    const sp = pa.speed * dt, ox = e.x, oy = e.y;
    moveWithSlide(e, dx / d * sp, dy / d * sp, e);
    if (Math.hypot(e.x - ox, e.y - oy) < sp * 0.3) { pa.stuck += dt; if (pa.stuck > 1.5) { pa.i = (pa.i + 1) % pa.route.length; pa.stuck = 0; } } else pa.stuck = 0;
  }
  // the whole of a guard's turn while nobody has raised the alarm. Returns true when it handled the turn.
  function guardTurn(e, dt) {
    const pa = e._pa;
    if (e.dead) return false;
    if (e.stun > 0 || e.state === 'passive') return false;
    if (e.state === 'chase') {
      if (!T.alarm) raiseAlarm((pa.sus >= 0.99 || wearingRobes()) ? 'seen' : 'loud');
      if (T.alarm === 'seen' && !T.collar && G.state === 'play' && Math.hypot(Engine.cam.x - e.x, Engine.cam.y - e.y) < 1.5) { T.collar = true; T.collarPending = true; }
      return T.collar;                                      // once he has your sleeve he does not strike
    }
    if (T.alarm) { e.hidden = false; e.state = 'chase'; e.alertT = 8; return false; }
    // away: with the deacon, at supper, gone for tea
    const away = T.away[pa.kind] > 0 || (pa.kind === 'warden' && sermonLive());
    if (away) {
      if (!e.hidden && unseenBy(e, 9)) e.hidden = true;
      if (e.hidden) return true;
    } else if (e.hidden) {
      if (unseenBy(e, 6)) awayEnd(e);
      return true;
    }
    if (e.hidden) return true;
    // cover first: the robes (the game's own inspection decides), then the look
    const robes = (typeof disguiseProtects === 'function') && disguiseProtects(e);
    let gain = 0;
    if (!robes && G.state === 'play') {
      gain = senseGain(e);
      if (gain === 0 && e.state !== 'investigate' && hears(e)) { const c = Engine.cam; e.investigation = { x: c.x, y: c.y, left: B.LOOK_SECS }; e.state = 'investigate'; }
    }
    pa.sus = clamp(pa.sus + (gain > 0 ? gain * dt : -B.DECAY * dt), 0, 1.2);
    if (pa.sus >= 1) { raiseAlarm('seen'); return false; }
    if (e.state === 'investigate') { if (!updateInvestigation(e, dt)) { e.state = 'idle'; pa.wait = 0.8; } return true; }
    patrolStep(e, dt);
    return true;
  }

  // ---------------------------------------------------------------- the haul: letters, ledgers, hand-overs
  function applyRep(fac, d) { try { if (d && typeof changeRep === 'function') changeRep(fac, d); } catch (e) { warnOnce('rep', e); } }
  function xp(n) { try { if (n && typeof questXp === 'function') questXp(n); } catch (e) { warnOnce('xp', e); } }
  function gold(n) { try { if (n && hasG()) G.gold(n); } catch (e) { warnOnce('gold', e); } }
  function deliverLetter(k) {
    if (!hasG() || !active() || !hasLetter(k) || delivered(k)) return TX.letters.closedWorld;
    const p = B.L_LETTER[k];
    try { G.take(itemId(k)); } catch (e) { return TX.letters.closedWorld; }
    fset('p16h_l_ld', fint('p16h_l_ld') | LBIT[k]);                   // settle the books first: it can never pay twice
    applyRep('hedge', p[0]); gold(p[1]); xp(p[2]);
    if (deliveredCount() === LETTER_IDS.length) {
      fset('p16h_l_all', true); fset('p16h_l_q', 6);
      applyRep('hedge', B.L_ALL_HEDGE);
      try { if (typeof earnTitle === 'function') earnTitle(TX.letters.allTitle); } catch (e) { warnOnce('title', e); }
      jrn(TX.l.j.all);
    }
    return TX.letters[k].react;
  }
  const ADDRESSEE = { lyra: 'lyra', kaelen: 'kaelen', hetty: 'hetty', orla: 'orla', pim: 'pim', dessa: NPC_IDS.dessa };
  function addresseeNear(k) {
    if (!hasG() || typeof Engine === 'undefined' || !Engine.cam) return false;
    const c = Engine.cam;
    return G.ents.some((e) => e && e.kind === 'npc' && e.id === ADDRESSEE[k] && !e.hidden && !e.dead && Math.hypot(e.x - c.x, e.y - c.y) < B.NEAR);
  }
  const docOf = (code) => (code === 'rv' || code === 'rs' ? 'roster' : 'lease');
  function handOver(code) {
    const spec = B.D_GIVE[code];
    if (!spec || !hasG() || !active()) return false;
    const doc = docOf(code);
    const given = doc === 'roster' ? (fbool('p16h_d_rv') || fbool('p16h_d_rs')) : (fbool('p16h_d_lm') || fbool('p16h_d_ls'));
    if (!hasDoc(doc) || given) return false;
    try { G.take('p16h_' + doc); } catch (e) { return false; }
    fset('p16h_d_' + code, true);                                        // books first
    applyRep('hedge', spec[0]); applyRep('synod', spec[1]); gold(spec[2]); xp(spec[3]);
    jrn(TX.d.j[code]);
    if ((fbool('p16h_d_rv') || fbool('p16h_d_rs')) && (fbool('p16h_d_lm') || fbool('p16h_d_ls'))) fset('p16h_d_q', 6);
    return true;
  }
  function readLetter(k) {
    const L = TX.letters[k], near = addresseeNear(k) && active() && !delivered(k);
    const ch = [];
    if (near) ch.push({ t: TX.letters.deliverBtn, f: () => { const r = deliverLetter(k); setTimeout(() => showEvent(L.title, r, [{ t: TX.page.closeBtn, f: null }]), 0); } });
    ch.push({ t: TX.letters.readFold, f: null });
    try { closeModal(); } catch (e) { /* none open */ }
    showEvent(L.title, L.text + (near ? '' : '<br><br><i>' + TX.letters.notHere + '</i>'), ch);
  }
  function readDoc(slot) {
    const it = ITEMS[slot.id];
    try { closeModal(); } catch (e) { /* none open */ }
    showEvent(it.name, it.desc + '<br><br>' + TX.items.read + '<br><br><i>' + TX.items.carry + '</i>', [{ t: TX.letters.readFold, f: null }]);
  }

  // ---------------------------------------------------------------- the alarm
  function raiseAlarm(kind) {
    if (!inHeist() || T.alarm) return false;
    const h = heistHere(), loud = kind !== 'seen';
    T.alarm = loud ? 'loud' : 'seen'; T.alarmT = 0; T.reinfDone = false; T.watchDone = false; T.collar = false;
    fset(h === 'L' ? 'p16h_l_al' : 'p16h_d_al', loud ? 2 : 1);
    if (loud) fset(h === 'L' ? 'p16h_l_ap' : 'p16h_d_ap', 3);
    for (const e of guardsOf()) { e.hidden = false; e.state = 'chase'; e.alertT = 8; delete e.investigation; e._pa.sus = 1; }
    T.away.warden = 0; T.away.pike = 0;
    say(loud ? (h === 'L' ? TX.l.loud : TX.d.loud) : (h === 'L' ? TX.l.seen : TX.d.seen), 'bad', 7000);
    try { Audio_.sfx.bell(); } catch (e) { /* silent */ }
    try { reportCrime(h === 'L' ? TX.l.crime : TX.d.crime, B.BOUNTY); } catch (e) { warnOnce('crime', e); }
    if (h === 'L') applyRep('synod', B.L_SYNOD); else { applyRep('office', B.D_OFFICE); applyRep('synod', B.D_SYNOD); }
    if (!loud) seize(h);
    return true;
  }
  // being seen with the haul in your coat: it goes back where it came from, and the lock is new
  function seize(h) {
    const q = h === 'L' ? stageL() : stageD();
    if (q !== 4) return false;
    try {
      if (h === 'L') { for (const k of LETTER_IDS) if (!delivered(k)) { while (G.has(itemId(k))) G.take(itemId(k)); } fclear('p16h_pk_cab'); }
      else { for (const k of ['p16h_roster', 'p16h_lease']) while (G.has(k)) G.take(k); fclear('p16h_pk_safe'); }
    } catch (e) { warnOnce('seize', e); }
    fset(h === 'L' ? 'p16h_l_q' : 'p16h_d_q', 3);
    say(h === 'L' ? TX.l.seized : TX.d.seized, 'bad', 7000);
    syncProps();
    return true;
  }
  function reinforce(dt) {
    if (!T.alarm || !inHeist()) return;
    T.alarmT += dt;
    const h = heistHere(), m = G.map;
    if (h === 'L' && !T.watchDone && T.alarmT >= B.WATCH_SECS) {
      T.watchDone = true;
      if (!find(m, 'watch')) {
        put(m, 'watch', () => person('townsman', V.SPAWN.x + 0.8, V.SPAWN.y, 'townsman', 0, { lawGuard: true, name: TX.names.constable, wander: false }));
        say(TX.l.watch, 'bad', 6000);
      }
    }
    if (h === 'D' && !T.reinfDone && T.alarmT >= B.REINF_SECS) {
      T.reinfDone = true;
      for (const [x, y, n] of [[2.6, 10.6, 'a'], [3.8, 11.0, 'b']]) {
        if (find(m, 'reinf' + n)) continue;
        const e = hydrate({ kind: 'enemy', type: 'legionnaire', name: TX.names.legionnaire, x, y }); e.transient = true; e._p16h = 'reinf' + n; e.state = 'chase'; e.alertT = 8; m.entities.push(e);
      }
      say(TX.d.reinforce, 'bad', 6000);
    }
  }
  // "seen": the guard takes your sleeve and walks you out. The haul goes back, the crime stands (the existing law deals with it).
  function doCollar() {
    T.collarPending = false;
    const h = heistHere(); if (!h) return;
    seize(h);
    const to = h === 'L' ? { map: 'chapel', x: 1.7, y: 3.5, dir: 0 } : { map: 'quarry', x: 31.3, y: 6.5, dir: Math.PI };
    try { G.lawGrace = Math.max(Number(G.lawGrace) || 0, 4); } catch (e) { /* ignore */ }
    loadMap(to.map, { x: to.x, y: to.y, dir: to.dir });
  }

  // ---------------------------------------------------------------- the break-in: in, take, out
  function approachNow(h) {
    if (h === 'L') { if (fbool('p16h_l_br')) return 2; if (wearingRobes()) return 5; if (sermonLive()) return 4; return 1; }
    return wearingRobes() ? 5 : 1;
  }
  function onEnter(h) {
    const m = G.map, qk = h === 'L' ? 'p16h_l_q' : 'p16h_d_q';
    T.alarm = null; T.alarmT = 0; T.reinfDone = false; T.watchDone = false; T.collar = false; T.collarPending = false;
    T.away.warden = 0; T.away.pike = 0; T.bore = 16; T.said = {}; T.sus = 0;
    for (const k of ['watch', 'reinfa', 'reinfb']) drop(m, k);
    for (const e of entsOf(m)) if (e && e._lamp) { e.glow = 0.65; e.label = h === 'L' ? TX.look.lamp : TX.look2.lamp; }
    const fresh = fint(qk) < 3;
    if (fresh) {
      fset(qk, 3); fset(h === 'L' ? 'p16h_l_al' : 'p16h_d_al', 0);
      const ap = approachNow(h); fset(h === 'L' ? 'p16h_l_ap' : 'p16h_d_ap', ap);
      jrn(h === 'L' ? TX.l.j.in : TX.d.j.in);
    }
    const ap = fint(h === 'L' ? 'p16h_l_ap' : 'p16h_d_ap');
    spawnGuards(m, h);
    if (h === 'L' && fbool('p16h_l_br')) awayStart('warden', B.L_AWAY);
    say(h === 'L' ? (ap === 2 ? TX.l.enterBribed : ap === 4 ? TX.l.enterSermon : TX.l.enter) : TX.d.enter, '', 7000);
    syncProps();
  }
  // leaving a heist map (any way out), or finding oneself outside one with the job half-done: settle the books
  const haulHeld = (h) => (h === 'L' ? LETTER_IDS.some((k) => !delivered(k) && hasLetter(k)) : (hasDoc('roster') || hasDoc('lease')));
  function settle(h, dest) {
    const qk = h === 'L' ? 'p16h_l_q' : 'p16h_d_q', kk = h === 'L' ? 'p16h_l_k' : 'p16h_d_k';
    if (dest === 'watchhouse') seize(h);                         // taken to the watch-house: the haul does not go with you
    if (fint(qk) === 4 && !haulHeld(h)) fset(qk, 3);             // a stage that claims a haul nobody carries is only a stage
    const q = fint(qk);
    const alarm = !!T.alarm || fint(h === 'L' ? 'p16h_l_al' : 'p16h_d_al') > 0;
    if (q === 4) {
      fset(qk, 5);
      if (h === 'L') {
        fset('p16h_l_out', true); if (!alarm) fset('p16h_l_clean', true); else fclear('p16h_l_clean');
        xp(B.L_OUT_XP); applyRep('hedge', B.L_OUT_HEDGE);
        jrn(alarm ? TX.l.j.outLoud : TX.l.j.outClean); say(alarm ? TX.l.outLoud : TX.l.outClean, alarm ? 'warn' : 'good', 9000);
      } else {
        fset('p16h_d_out', true); if (!alarm) fset('p16h_d_clean', true); else fclear('p16h_d_clean');
        xp(B.D_OUT_XP);
        jrn(alarm ? TX.d.j.outLoud : TX.d.j.outClean); say(alarm ? TX.d.outLoud : TX.d.outClean, alarm ? 'warn' : 'good', 9000);
      }
    } else if (q === 3) {
      fset(qk, fint(kk) === 7 ? 2 : 1);
      if (alarm) { fset(h === 'L' ? 'p16h_l_try' : 'p16h_d_try', fint(h === 'L' ? 'p16h_l_try' : 'p16h_d_try') + 1); jrn(h === 'L' ? TX.l.j.failed : TX.d.j.failed); }
      say(h === 'L' ? TX.l.outEmpty : TX.d.outEmpty, 'warn', 7000);
    }
    if (h === 'L') { fclear('p16h_l_br'); fclear('p16h_pk_cab'); fclear('p16h_pk_box'); try { delete G.flags['picked:chapel:door:0:3']; } catch (e) { /* ignore */ } }
    else { fclear('p16h_d_br'); fclear('p16h_pk_safe'); try { delete G.flags['picked:quarry:door:32:7']; } catch (e) { /* ignore */ } }
    T.alarm = null; T.collar = false; T.collarPending = false;
    const m = mapOf(h === 'L' ? MAP_V : MAP_D);
    if (m) { removeGuards(m); for (const k of ['watch', 'reinfa', 'reinfb']) drop(m, k); }
    try { syncAll(); } catch (e) { warnOnce('settle sync', e); }
  }
  function settleStale() {
    if (!hasG() || inHeist()) return;
    if (stageL() === 3 || stageL() === 4) settle('L');
    if (stageD() === 3 || stageD() === 4) settle('D');
  }
  function checkClosure() {
    if (!hasG() || !gone()) return;
    for (const h of ['L', 'D']) {
      if (closed(h) || done(h)) continue;
      const q = h === 'L' ? stageL() : stageD();
      if (q < 1) continue;
      fset(h === 'L' ? 'p16h_l_closed' : 'p16h_d_closed', true);
      jrn(h === 'L' ? TX.l.j.closed : TX.d.j.closed);
    }
    syncAll();
  }

  // ---------------------------------------------------------------- using the things in the two maps
  function douse(e) {
    if (!(e.glow > 0)) { say(TX.look.lampUsed, '', 3000); return; }
    e.glow = 0; e.label = inV() ? TX.look.lampOut : TX.look2.lampOut;
    try { addNoise(0.3); } catch (err) { /* no noise */ }
    say(TX.look.douse, '', 3000);
  }
  function hatchOut() {
    const h = heistHere(); if (!h) return;
    const to = h === 'L' ? { map: 'oakhaven', x: 48.5, y: 2.7, dir: Math.PI / 2 } : { map: 'quarry', x: 33.4, y: 5.5, dir: Math.PI };
    try { Audio_.sfx.door(); } catch (e) { /* silent */ }
    transfer(to);
  }
  function readBoard(h) {
    if (!active() || closed(h)) { say(TX.say.closed, '', 3000); return; }
    const kk = h === 'L' ? 'p16h_l_k' : 'p16h_d_k', bit = h === 'L' ? 2 : 2, had = (fint(kk) & bit) !== 0;
    const body = h === 'L' ? TX.chapel.board : TX.d.board, learn_ = h === 'L' ? TX.chapel.boardLearn : TX.d.boardLearn;
    learn(h, bit);
    showEvent(h === 'L' ? TX.chapel.boardLabel : TX.d.boardLabel, body + (had ? '' : '<br><br>' + learn_), [{ t: TX.page.closeBtn, f: null }]);
  }
  function takeLetters() {
    if (!active() || stageL() >= 4) return false;
    for (const k of LETTER_IDS) if (!delivered(k) && !hasLetter(k)) G.give(itemId(k));
    fset('p16h_l_q', 4); fset('p16h_pk_cab', true);
    say(TX.take.cabTook, 'good', 8000); jrn(TX.take.cabJournal);
    syncProps();
    return true;
  }
  function openCabinet(e) {
    if (!active() || closed('L')) { say(TX.look.cabinetGone, '', 5000); return; }
    if (stageL() >= 4) { say(TX.look.cabinetOpen, '', 5000); return; }
    if (fbool('p16h_pk_cab')) { takeLetters(); return; }
    const T_ = TX.take, ch = [];
    if (fbool('p16h_l_br')) ch.push({ t: T_.cabKey, f: () => { takeLetters(); } });
    ch.push({ t: T_.cabPick, f: () => { if (!beginLockpick(e, 'p16h_pk_cab', B.L_CAB_DIFF, () => { takeLetters(); })) say(TX.look.cabinet, '', 3000); } });
    ch.push({ t: T_.cabForce, f: () => { if (sermonLive()) say(T_.forceCover, '', 6000); else { try { addNoise(9); } catch (err) { /* none */ } raiseAlarm('loud'); } takeLetters(); } });
    ch.push({ t: T_.cabLeave, f: null });
    showEvent(T_.cabTitle, T_.cabBody, ch);
  }
  function takeFee() {
    if (!active() || fbool('p16h_l_fee')) return false;
    fset('p16h_l_fee', true); gold(B.L_FEE); fset('p16h_pk_box', true);
    say(TX.take.boxTook, 'good', 6000); syncProps();
    return true;
  }
  function openBox(e) {
    if (!active() || closed('L')) { say(TX.look.box, '', 4000); return; }
    if (fbool('p16h_l_fee')) { say(TX.look.boxOpen, '', 4000); return; }
    const T_ = TX.take;
    showEvent(T_.boxTitle, T_.boxBody, [
      { t: T_.boxPick, f: () => { if (!beginLockpick(e, 'p16h_pk_box', B.L_BOX_DIFF, () => { takeFee(); })) say(TX.look.box, '', 3000); } },
      { t: T_.boxForce, f: () => { try { addNoise(9); } catch (err) { /* none */ } takeFee(); } },
      { t: T_.cabLeave, f: null },
    ]);
  }
  function takeDocs() {
    if (!active() || stageD() >= 4) return false;
    for (const k of ['p16h_roster', 'p16h_lease']) if (!G.has(k)) G.give(k);
    fset('p16h_d_q', 4); fset('p16h_pk_safe', true);
    say(TX.safe.took, 'good', 8000); jrn(TX.safe.journal);
    if (!fbool('p16h_d_cash')) { fset('p16h_d_cash', true); gold(B.D_CASH); setTimeout(() => say(TX.safe.cash, 'good', 5000), 1200); }
    syncProps();
    return true;
  }
  function openSafe(e) {
    if (!active() || closed('D')) { say(TX.look2.safe, '', 4000); return; }
    if (stageD() >= 4) { say(TX.look2.safeOpen, '', 4000); return; }
    if (fbool('p16h_pk_safe')) { takeDocs(); return; }
    const T_ = TX.safe, ch = [];
    if (fbool('p16h_d_br')) ch.push({ t: T_.key, f: () => { takeDocs(); } });
    ch.push({ t: T_.pick, f: () => { if (!beginLockpick(e, 'p16h_pk_safe', B.D_SAFE_DIFF, () => { takeDocs(); })) say(TX.look2.safe, '', 3000); } });
    ch.push({ t: T_.force, f: () => { if (boreOn() && T.bore % B.BORE_PERIOD < B.BORE_GRIND - 1.5) say(T_.forceCover, '', 6000); else { try { addNoise(9); } catch (err) { /* none */ } raiseAlarm('loud'); } takeDocs(); } });
    ch.push({ t: T_.leave, f: null });
    showEvent(T_.title, T_.body, ch);
  }
  function useHeist(e) {
    const k = e && e._k;
    if (k === 'lamp') { douse(e); return true; }
    if (k === 'hatch') { hatchOut(); return true; }
    if (k === 'cab') { openCabinet(e); return true; }
    if (k === 'box') { openBox(e); return true; }
    if (k === 'safe') { openSafe(e); return true; }
    if (k === 'cboard') { readBoard('L'); return true; }
    if (k === 'qboard') { readBoard('D'); return true; }
    const t = (inV() ? TX.look : TX.look2)[k];
    if (typeof t === 'string' && t) { say(t, '', 7000); return true; }
    return false;
  }
  function syncProps() {
    const mv = mapOf(MAP_V), md = mapOf(MAP_D), q = (m, k) => entsOf(m).find((e) => e && e._k === k);
    if (mv) {
      const cab = q(mv, 'cab'); if (cab) cab.label = stageL() >= 4 ? TX.look.cabinetOpen : closed('L') ? TX.look.cabinetGone : TX.look.cabinet;
      const box = q(mv, 'box'); if (box) box.label = fbool('p16h_l_fee') ? TX.look.boxOpen : TX.look.box;
    }
    if (md) { const sf = q(md, 'safe'); if (sf) sf.label = stageD() >= 4 ? TX.look2.safeOpen : TX.look2.safe; }
  }

  // ---------------------------------------------------------------- the heist page (the logbook) and the badge
  const tpl = (s, n) => String(s).replace('{0}', String(n));
  function pageHtml() {
    const P = TX.page;
    const sec = (key, q, k, ap, tries, extra) => {
      const H = P[key], bits = key === 'L' ? [['kRoute', 'unknownRoute'], ['kWindow', 'unknownWindow'], ['kKeys', 'unknownKeys']] : [['kRoute', 'unknownRoute'], ['kBell', 'unknownBell'], ['kSafe', 'unknownSafe']];
      let h = '<h3>' + H.head + '</h3><p class="muted">' + H.sub + '</p><p><b>' + H['s' + q] + '</b></p><ul class="p16h-k">';
      bits.forEach((b, i) => { h += '<li>' + ((k >> i) & 1 ? H[b[0]] : H[b[1]]) + '</li>'; });
      h += '</ul>';
      if (key === 'L') { if (sermonLive()) h += '<p>' + H.liveNow + '</p>'; else if (nightL()) h += '<p>' + H.nightNow + '</p>'; }
      else h += '<p>' + (nightD() ? H.nightNow : H.dayNow) + '</p>';
      if (ap >= 1 && q >= 3) { const nm = { 1: H.howQuiet, 2: H.howBribe, 3: H.howLoud, 4: H.howHymn, 5: H.howRobes }[ap]; if (nm) h += '<p>' + tpl(H.how, nm) + '</p>'; }
      if (tries > 0) h += '<p>' + tpl(H.tries, tries) + '</p>';
      return h + extra;
    };
    let body = '';
    const ql = stageL(), qd = stageD(), kl = fint('p16h_l_k'), kd = fint('p16h_d_k');
    if (ql >= 1 || kl) {
      let ex = '';
      if (ql >= 3 || deliveredCount() > 0) {
        ex = '<p><b>' + P.L.letters + '</b></p><ul class="p16h-k">';
        for (const k of LETTER_IDS) ex += '<li>' + P.L.to[k] + ': ' + (delivered(k) ? P.L.delivered : hasLetter(k) ? P.L.carried : P.L.left) + '</li>';
        ex += '</ul>';
      }
      body += sec('L', ql, kl, fint('p16h_l_ap'), fint('p16h_l_try'), ex);
    }
    if (qd >= 1 || kd) {
      let ex = '';
      if (qd >= 4 || fbool('p16h_d_rv') || fbool('p16h_d_rs') || fbool('p16h_d_lm') || fbool('p16h_d_ls')) {
        ex = '<p><b>' + P.D.gave + '</b></p><ul class="p16h-k">';
        if (hasDoc('roster')) ex += '<li>' + P.D.haveRoster + '</li>';
        if (hasDoc('lease')) ex += '<li>' + P.D.haveLease + '</li>';
        for (const c of ['rv', 'rs', 'lm', 'ls']) if (fbool('p16h_d_' + c)) ex += '<li>' + P.D[c] + '</li>';
        ex += '</ul>';
      }
      body += sec('D', qd, kd, fint('p16h_d_ap'), fint('p16h_d_try'), ex);
    }
    if (!body) body = '<p class="muted">' + P.none + '</p>';
    return '<h2>' + P.title + '</h2><button class="dfbtn small close" id="p16h-x">' + P.closeBtn + '</button><div class="p16h-page">' + body + '</div><div class="btns"><button class="dfbtn small" id="p16h-back">' + P.backBtn + '</button></div>';
  }
  function showPage() {
    if (!hasG()) return;
    G.state = 'panel';
    openModal(pageHtml(), 'heist16');
    const x = document.getElementById('p16h-x'), b = document.getElementById('p16h-back');
    if (x) x.onclick = () => { closeModal(); G.state = 'play'; };
    if (b) b.onclick = () => { try { renderLog(); } catch (e) { closeModal(); G.state = 'play'; } };
  }
  const anyHeist = () => stageL() >= 1 || stageD() >= 1 || fint('p16h_l_k') > 0 || fint('p16h_d_k') > 0;
  function decorateLog() {
    if (!on() || !anyHeist()) return;
    const panel = document.getElementById('modal-panel'); if (!panel || document.getElementById('p16h-open')) return;
    const btn = document.createElement('button'); btn.className = 'dfbtn small'; btn.id = 'p16h-open'; btn.type = 'button'; btn.textContent = TX.page.tab;
    btn.onclick = () => showPage();
    const x = document.getElementById('x'); if (x && x.parentNode) x.parentNode.insertBefore(btn, x.nextSibling); else panel.appendChild(btn);
  }
  let badge = null;
  function injectStyle() {
    if (typeof document === 'undefined' || document.getElementById('p16h-style')) return;
    const st = document.createElement('style'); st.id = 'p16h-style';
    st.textContent = '#p16h-badge{position:absolute;left:50%;top:2.2cqh;transform:translateX(-50%);z-index:30;padding:.35cqh 1.4cqw;border:1px solid rgba(200,190,150,.6);border-radius:2cqh;background:rgba(20,18,14,.74);color:#e2dcc4;font-family:var(--font-sc,serif);font-size:2.6cqh;letter-spacing:.06em;pointer-events:none;display:none;white-space:nowrap;max-width:96cqw;overflow:hidden;text-overflow:ellipsis}' +
      '#p16h-badge.on{display:block}#p16h-badge.hot{border-color:#c8553c;color:#f2c6b6}' +
      '.p16h-page{font-size:2.6cqh;line-height:1.25}.p16h-page h3{margin:.8cqh 0 .3cqh}.p16h-page p{margin:.3cqh 0}.p16h-k{margin:.2cqh 0 .6cqh 2cqw;padding:0}.p16h-k li{margin:.2cqh 0}';
    (document.head || document.documentElement).appendChild(st);
  }
  function zoneName() {
    const c = Engine.cam, z = inV() ? zoneV(c.x, c.y) : zoneD(c.x, c.y);
    return TX.badge.zone[z === 'vestry' ? 'vestry' : z] || '';
  }
  function updateBadge() {
    if (typeof document === 'undefined') return;
    const show = hasG() && inHeist() && active() && G.state !== 'title';
    if (!badge) { const host = document.getElementById('game'); if (!host) return; injectStyle(); badge = document.createElement('div'); badge.id = 'p16h-badge'; badge.setAttribute('role', 'status'); badge.setAttribute('aria-live', 'polite'); badge.setAttribute('aria-label', TX.badge.aria); host.appendChild(badge); }
    if (!show) { badge.classList.remove('on'); return; }
    const pct = Math.round(clamp(T.sus, 0, 1) * 100), parts = [];
    if (T.alarm) parts.push(TX.badge.alarm); else parts.push(pct > 1 ? tpl(TX.badge.watched, pct) : TX.badge.unseen);
    parts.push(T.lit ? TX.badge.lit : TX.badge.dark);
    if (inV() && sermonLive()) parts.push(TX.badge.hymn);
    if (inD()) parts.push(boreOn() ? TX.badge.boreOn : TX.badge.boreOff);
    if ((fint(inV() ? 'p16h_l_k' : 'p16h_d_k') & 1) && !T.alarm) {
      const g = guardsOf()[0];
      if (g) parts.push(tpl(inV() ? TX.badge.warden : TX.badge.reckoner, g.hidden ? TX.badge.away : zoneName()));
    }
    const text = parts.join(' · ');
    if (badge.textContent !== text) badge.textContent = text;
    badge.classList.add('on'); badge.classList.toggle('hot', !!T.alarm || pct >= 60);
  }

  // ---------------------------------------------------------------- per-frame work
  function tick(dt) {
    if (!hasG() || typeof Engine === 'undefined' || !Engine.cam || !G.maps) return;
    dt = clamp(Number(dt) || 0, 0, 0.25);
    T.clock += dt;
    if (inHeist() && cineOn() !== G.map.entities.some((e) => e && e._p16hFill)) { try { syncFill(); } catch (e) { warnOnce('fill', e); } }   // a preset changed inside
    T.doorT -= dt;
    if (T.doorT <= 0) { T.doorT = 1; try { if (gone()) checkClosure(); syncAll(); settleStale(); } catch (e) { warnOnce('slow', e); } }
    if (T.collarPending) { try { doCollar(); } catch (e) { T.collarPending = false; warnOnce('collar', e); } return; }
    if (!inHeist()) { try { updateBadge(); } catch (e) { /* cosmetic */ } try { boreHum(0); } catch (e) { /* silent */ } return; }
    if (!active()) { removeGuards(G.map); try { updateBadge(); } catch (e) { /* cosmetic */ } return; }
    T.bore += dt;
    for (const w of ['warden', 'pike']) if (T.away[w] > 0) T.away[w] = Math.max(0, T.away[w] - dt);
    if (inD()) { const ines = find(G.map, 'ines'); if (ines) ines.hidden = T.away.pike > 0; try { boreHum(boreOn() ? 0.55 : 0.12); } catch (e) { /* silent */ } }
    let s = 0; for (const e of guardsOf()) if (!e.hidden) s = Math.max(s, e._pa.sus);
    T.sus = s;
    reinforce(dt);
    T.badgeT -= dt; if (T.badgeT <= 0) { T.badgeT = 0.1; try { updateBadge(); } catch (e) { warnOnce('badge', e); } }
  }
  function boreHum(level) { if (typeof Audio_ !== 'undefined' && Audio_.hum) Audio_.hum(level, 58, 'p16h-bore'); }

  // ---------------------------------------------------------------- arriving
  function onLoad(id, prevId) {
    sanitize();
    if (gone()) checkClosure();
    if (prevId === MAP_V || prevId === MAP_D) { /* settle ran before the map changed */ }
    try { syncAll(); } catch (e) { warnOnce('onLoad sync', e); }
    if (hasG() && G.map && G.map.id === id && (id === MAP_V || id === MAP_D)) {
      const c = Engine.cam, m = G.map, h = id === MAP_V ? 'L' : 'D';
      if (!active()) { c.x = m.spawn.x; c.y = m.spawn.y; c.dir = m.spawn.dir; return; }
      onEnter(h);
    }
  }

  // ---------------------------------------------------------------- rumours, the Gazette, options
  const RUMOUR_DEFS = [
    { id: 'd_p16h_l', cat: 'deed', who: 'any', rank: 70, req: ['p16h_l_out'], note: TX.rumour.lNote, text: TX.rumour.l },
    { id: 'd_p16h_lall', cat: 'deed', who: 'patron', rank: 71, req: ['p16h_l_all'], note: TX.rumour.lAllNote, text: TX.rumour.lAll },
    { id: 'd_p16h_rv', cat: 'deed', who: 'any', rank: 70, req: ['p16h_d_rv'], note: TX.rumour.dRNote, text: TX.rumour.dR },
    { id: 'd_p16h_rs', cat: 'deed', who: 'any', rank: 70, req: ['p16h_d_rs'], note: TX.rumour.dSNote, text: TX.rumour.dS },
    { id: 'd_p16h_lm', cat: 'deed', who: 'any', rank: 70, req: ['p16h_d_lm'], note: TX.rumour.dMNote, text: TX.rumour.dM },
    { id: 'd_p16h_ls', cat: 'deed', who: 'any', rank: 70, req: ['p16h_d_ls'], note: TX.rumour.dLNote, text: TX.rumour.dL },
  ];
  function wireStory() {
    if (typeof STORYRUM === 'undefined' || !STORYRUM.RUMOURS) return;
    const ids = new Set(STORYRUM.RUMOURS.map((r) => r.id));
    for (const d of RUMOUR_DEFS) if (!ids.has(d.id)) STORYRUM.RUMOURS.push(Object.assign({}, d));
  }
  function row(grid) {
    const mk = (tag, props, text) => { const e = document.createElement(tag); if (props) for (const k in props) e.setAttribute(k, props[k]); if (text != null) e.textContent = text; return e; };
    const lab = mk('span', { class: 'gfx-label' }, TX.opts.label + ' '); lab.appendChild(mk('small', { class: 'muted' }, TX.opts.hint));
    const b = mk('button', { class: 'dfbtn small', id: 'h16-heist-opt', type: 'button', 'aria-pressed': String(cfg.on) }, cfg.on ? 'On' : 'Off');
    b.classList.toggle('sel', cfg.on);
    b.onclick = () => {
      cfg.on = !cfg.on; saveCfg(); b.textContent = cfg.on ? 'On' : 'Off'; b.setAttribute('aria-pressed', String(cfg.on)); b.classList.toggle('sel', cfg.on);
      try { syncAll(); if (!cfg.on && inHeist()) removeGuards(G.map); updateBadge(); } catch (e) { /* ignore */ }
    };
    grid.appendChild(lab); grid.appendChild(b);
  }

  // ---------------------------------------------------------------- wiring: wrap, never edit
  const wire = (name, fn) => { try { fn(); } catch (e) { console.warn('heist16: ' + name + ' wiring failed', e); } };
  function wireMaps() {
    if (typeof LAW_MAPS !== 'undefined' && LAW_MAPS && LAW_MAPS.add) LAW_MAPS.add(MAP_V);
    if (typeof buildAllMaps === 'function') {
      const _b = buildAllMaps;
      buildAllMaps = function () {
        const maps = _b.apply(this, arguments);
        try { if (!maps[MAP_V]) maps[MAP_V] = buildVestry(); if (!maps[MAP_D]) maps[MAP_D] = buildDepot(); addDoors(maps); } catch (e) { warnOnce('build', e); }
        return maps;
      };
    }
    if (typeof loadMap === 'function') {
      const _lm = loadMap;
      loadMap = function (id) {
        let prev = null;
        try { sanitize(); prev = hasG() ? G.mapId : null; } catch (e) { /* ignore */ }
        try { if ((prev === MAP_V || prev === MAP_D) && id !== prev) settle(prev === MAP_V ? 'L' : 'D', id); } catch (e) { warnOnce('leave', e); }
        const r = _lm.apply(this, arguments);
        try { onLoad(id, prev); } catch (e) { warnOnce('loadMap', e); }
        return r;
      };
    }
    if (typeof restoreGame === 'function') {
      const _rg = restoreGame;
      restoreGame = function () {
        const r = _rg.apply(this, arguments);
        try { sanitize(); T.said = {}; T.alarm = null; syncAll(); if (G.map && (G.mapId === MAP_V || G.mapId === MAP_D) && G.map.isBlocked(Engine.cam.x | 0, Engine.cam.y | 0)) { const sp = G.map.spawn || { x: 2.5, y: 2.5 }; Engine.cam.x = sp.x; Engine.cam.y = sp.y; } if (inHeist() && active()) { const h = heistHere(); spawnGuards(G.map, h); if (h === 'L' && fbool('p16h_l_br')) awayStart('warden', B.L_AWAY); if (h === 'D' && fbool('p16h_d_br')) awayStart('pike', B.D_AWAY); } } catch (e) { warnOnce('restore', e); }
        return r;
      };
    }
    if (typeof startGame === 'function') {
      const _sg = startGame;
      startGame = function () { const r = _sg.apply(this, arguments); try { T.said = {}; T.alarm = null; T.away.warden = 0; T.away.pike = 0; syncAll(); } catch (e) { warnOnce('start', e); } return r; };
    }
    if (typeof update === 'function') {
      const _up = update;
      update = function (dt) {
        const r = _up.apply(this, arguments);
        try { if (G.state === 'play' || G.state === undefined) tick(dt); } catch (e) { warnOnce('tick', e); }
        return r;
      };
    }
    if (typeof enemyUpdate === 'function') {
      const _eu = enemyUpdate;
      enemyUpdate = function (e) {
        if (e && e._pa && cfg.on !== false && inHeist() && active()) {
          try { if (guardTurn(e, arguments[1])) return; } catch (err) { warnOnce('guard', err); }
        }
        return _eu.apply(this, arguments);
      };
    }
  }
  function wireUse() {
    if (typeof useDeco === 'function') {
      const _use = useDeco;
      useDeco = function (e) {
        try { if (e && e.use === 'p16h_use' && useHeist(e)) return; } catch (err) { warnOnce('use', err); }
        return _use.apply(this, arguments);
      };
    }
    if (typeof useItem === 'function') {
      const _item = useItem;
      useItem = function (slot) {
        const it = slot && typeof slot.id === 'string' && typeof ITEMS !== 'undefined' ? ITEMS[slot.id] : null;
        if (it && it.use === 'p16h_letter') { try { readLetter(LETTER_IDS.find((k) => itemId(k) === slot.id)); } catch (e) { warnOnce('letter', e); } return; }
        if (it && it.use === 'p16h_doc') { try { readDoc(slot); } catch (e) { warnOnce('doc', e); } return; }
        return _item.apply(this, arguments);
      };
    }
  }
  function wireLog() {
    if (typeof renderLog === 'function') {
      const _rl = renderLog;
      renderLog = function () { const r = _rl.apply(this, arguments); try { decorateLog(); } catch (e) { warnOnce('log', e); } return r; };
    }
  }
  function wireGazette() {
    if (typeof showEvent !== 'function') return;
    const _show = showEvent;
    showEvent = function (title, html, choices) {
      try {
        if (active() && title === 'The Synod Gazette' && typeof html === 'string' && html.indexOf('rm-sheet') >= 0 && html.indexOf('p16h-item') < 0 && (fbool('p16h_l_out') || fbool('p16h_d_out'))) {
          const i = html.indexOf('<div class="rm-notice">');
          let item = '';
          if (fbool('p16h_l_out')) item += '<div class="rm-item p16h-item">' + TX.rumour.gaz + '</div>';
          if (fbool('p16h_d_out')) item += '<div class="rm-item p16h-item">' + TX.rumour.gazD + '</div>';
          html = i >= 0 ? html.slice(0, i) + item + html.slice(i) : html + item;
        }
      } catch (e) { warnOnce('gazette', e); }
      return _show.call(this, title, html, choices);
    };
  }
  function wireOptions() {
    if (typeof renderAccessibilityMenu !== 'function') return;
    const _acc = renderAccessibilityMenu;
    renderAccessibilityMenu = function () {
      const r = _acc.apply(this, arguments);
      try { const grid = document.querySelector('#modal-panel .ctl-grid'); if (grid && !document.getElementById('h16-heist-opt')) row(grid); } catch (e) { warnOnce('options', e); }
      return r;
    };
  }

  // ---------------------------------------------------------------- boot
  loadCfg();
  try { if (typeof document !== 'undefined') { paintAll(); injectStyle(); } } catch (e) { console.warn('heist16: art failed', e); }
  installItems(); installNpc();
  wire('maps', wireMaps); wire('use', wireUse); wire('story', wireStory);
  if (typeof document !== 'undefined') { wire('log', wireLog); wire('gazette', wireGazette); wire('options', wireOptions); }

  return {
    MAP_V, MAP_D, B, TX, V, D, FLAGS, T, cfg, saveCfg, loadCfg, NPC_IDS, LETTER_IDS,
    get TEXTS() { return LIST.slice(); },
    stageL, stageD, windowL, windowD, active, closed, done, gone, sanitize, syncAll, syncDoors, ensure,
    learn, hook, guide, askChoices, payOrrin, payInes, orrinQuest, inesQuest, vauseQuest, mossbrookQuest,
    takeLetters, takeDocs, takeFee, deliverLetter, handOver, readLetter, deliveredCount, delivered, hasLetter, hasDoc,
    raiseAlarm, seize, settle, settleStale, checkClosure, doCollar, onEnter, onLoad, tick, reinforce,
    guardTurn, senseGain, hears, effNoise, boreOn, isLit, litLamps, guardsOf, spawnGuards, removeGuards, makeGuard, awayStart,
    buildVestry, buildDepot, reach, zoneV, zoneD, pageHtml, showPage, decorateLog, updateBadge, readBoard, hatchOut, openCabinet, openBox, openSafe, douse,
    find, put, drop, wearingRobes, sermonLive, nightL, nightD, hourNow, approachNow, RUMOUR_DEFS,
  };
})();
if (typeof window !== 'undefined') window.HEIST16 = HEIST16;
