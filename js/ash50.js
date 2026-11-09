// ============================================================
//  ash50 — Ash in the Hold, played (Book One ch. 13; ROADMAP R9 item 8).
//
//  The Part Two ending's "Begin Part Three" button used to go straight to the startPart3 text card. Now it offers one
//  night aboard the Drift-Kestrel first (or sleep through it, and the card plays as before). Two new maps, a deck at
//  night over the Reach and the hold, built the way js/kestrel16.js builds hers:
//    1  THE NIGHT. Twenty-one aboard. Bettany's field hospital under the staysail: bring water from the cask, a tonic,
//       or hum the tending note (if you have it). Hetty counts the nine children aloud. Lyra at the stern in Vane's
//       coat: the second time, bring her the slate. YOU SAID DO IT. Nothing you can say helps; that is the beat.
//       Below, at the third crate, the Root through Kaelen's glass, still holding with a hole in it. Vane comes down
//       with a bottle and confesses if you made him hear the crates (vane_told), or stays on the ladder if not.
//       "You didn't have to say it." / "I know. That's why I said it."
//    2  THE FOURTH HOUR. Pennick screams. Hob Wendle has rooted into the deck. "I'm sorry about your ship, Captain."
//       Lyra has no voice; Bettany hums the tending note, badly, in the Narrow (and you may hum it with her). They cut
//       him out and put him over the side with four planks and five feet of beam. Vane says the words.
//    3  THE SEAMS [PROPOSED as play]: crawl the deck with Pennick and a lamp before first light, prising up every seam
//       that shows green. Miss one, and in Part Three the Kestrel's hold has a new pale plank where it was cut out
//       (cosmetic; the book's Pennick finds none).
//    4  FIRST LIGHT. The Church's firebreak ring burning in the green, eight hundred feet down. Tobiah Marsh: "I saw
//       what you put in the port." Tell him why, or say nothing. If you tell him and he still has his charts, he
//       gives them to you here, as in the book. "It was a beautiful Sequence, sir."
//    5  THE CALLING-SONG from four miles back, in Lyra's whole voice. Mags reaches for the axe.
//    6  THE BEAM. Kaelen writes 3½ and the names on the beam over the third crate; you can add the rest of yours.
//       If you left his old coat on the hut's step (js/governor46.js), he is wearing it [PROPOSED].
//  Then startPart3 runs, its card shortened to what the night did not show (js/grove.js asks ASH50).
//  Figures and seams are transient, staged from the flags. Flags: p50 (stage), p50_do (beats, bits), p50_w (the
//  wounded tended, bits), p50_sm (seams found, bits), p50_t (seconds of the search), p50_miss, p50_tob, p50_names.
// ============================================================
'use strict';

const ASH50 = (function () {
  const TEXTS = [];
  const S = (t) => { TEXTS.push(t); return t; };
  const hasG = () => typeof G !== 'undefined' && G && G.player && G.flags;
  const F = () => G.flags;
  const say = (t, cls, ms) => { try { msg(t, cls || '', ms || 5200); } catch (e) { /* cosmetic */ } };
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; console.warn('ash50: ' + k + ' failed', e); } };
  const guest = () => { try { return typeof SYNC19 !== 'undefined' && !!SYNC19.isGuest(); } catch (e) { return false; } };
  const fint = (k, lo, hi) => { const v = Number(hasG() ? F()[k] : 0); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.floor(v))) : 0; };
  const PI = Math.PI;

  const DECK = 'p50_deck', HOLD = 'p50_hold', MAPS = [DECK, HOLD];
  const SEAM_SECS = 140;
  const stage = () => fint('p50', 0, 9);
  const setStage = (n) => { F().p50 = n; };
  const live = () => stage() >= 1 && stage() <= 6;
  const did = (b) => (fint('p50_do', 0, 4095) & b) !== 0;
  const mark = (b) => { F().p50_do = fint('p50_do', 0, 4095) | b; };
  const B = { lyra1: 1, lyra2: 2, hetty: 4, bettany: 8, crate: 16, beam: 32, coat: 64, sung: 128, tended: 256 };
  const R = { t: 0, holding: false };

  const TX = {
    leave: S('Leave it.'),
    deckName: S('The Drift-Kestrel, at night'),
    holdName: S('The Kestrel\'s hold'),
    // the button
    startTitle: S('Ash in the Hold'),
    start: S('There are twenty-one of them on deck and nowhere to put any of them. The Drift-Kestrel is sixty feet of working deck and a hold full of crates, and by the second hour of the night it has become a field hospital run by an eighty-year-old midwife with no lamp oil.'),
    stay: S('Stay with them through the night'),
    sleep: S('Sleep through it, and wake over the Spectral Woods'),
    // the deck
    hatch: S('The hatch down to the hold'),
    toDeck: S('The ladder up to the deck'),
    hurt0: S('A man with a crushed foot, from the winch-house'),
    hurt1: S('A woman with a broken collarbone, from the line'),
    hurt2: S('Two of the four with rope-flayed hands'),
    hurt3: S('The other two with rope-flayed hands'),
    lissa: S('Lissa, eleven, who has not spoken'),
    lissaLook: S('A girl of eleven who had no hands to flay. She was carried up roped under the arms, and she has not spoken since. She is watching the dark go by under the rail, the way Lyra is.'),
    hurtLook: S('Under the spare staysail along the port rail, in the dark, with Bettany\'s bag beside them.'),
    hurtDone: S('Tended, as well as anyone can be up here. Bettany has moved on to the next.'),
    giveWater: S('Give them water'),
    giveTonic: S('Give them a tonic'),
    hum: S('Hum the tending note over them (8 voice)'),
    watered: S('You hold the cup and they drink it all, and look at you as if you had done something.'),
    tonicked: S('The tonic goes down bitter. A little colour comes back.'),
    hummed: S('You hum the tending note low, inside the Narrow, and the flayed meat on the palms knits pink at the edges. Across the deck Lyra hears it and does not turn her head.'),
    noCup: S('You have nothing to give them. There is a water cask by the starboard rail.'),
    cask: S('The water cask'),
    caskLook: S('A cask lashed to the starboard rail, half full, and a tin cup on a string.'),
    fill: S('Fill the cup'),
    filled: S('You fill the tin cup. It is very cold.'),
    bettany: S('Old Bettany, the midwife'),
    bettanyTalk: S('Bettany sits back on her heels. "I looked in her throat with a lamp and a spoon," she says, and doesn\'t look at the stern. "Rest it. Don\'t try. Not for days. I told her that." A pause. "Days, not weeks. I\'ve seen worse." She has not.'),
    hetty: S('Hetty Bram, with the children'),
    hettyCount: S('Hetty has the children in the lee of the crates in a nest of canvas. She counts them while you stand there, touching each lump of canvas with two fingers. "One. Two. Three. Four. Five. Six. Seven. Eight. Nine." She stops, and looks at nine for a while. Then she starts again from one.<br><br>She does it twice an hour. You understand that it is not about safety.'),
    hettyAgain: S('"Nine," Hetty says, without looking up. "Nine."'),
    nell: S('Nell Carder, with her son'),
    nellLook: S('Nell has her son. That is all there is to say about Nell tonight, and she would not thank you for saying more.'),
    // Lyra at the stern
    lyra: S('Lyra, at the stern rail, in Vane\'s coat'),
    lyra1: S('She sits wrapped in Vane\'s own coat with her white shift stiff and black down the front, and watches the black country go by underneath. She cannot make a sound. Not a whisper. Not a rasp. Kaelen crouches down beside her. "Bettany says days. Not weeks. She\'s seen worse." She does not turn her head.'),
    slateOffer: S('Kaelen has the slate. Take it to her'),
    lyra2: S('You hold out the slate and the chalk. She takes them and holds them in her lap for a long moment. Then she writes four words, and turns the slate around: not to you. Past your shoulder, to where Kaelen is standing by the mast.<br><br><b>YOU SAID DO IT.</b><br><br>"Yes," says Kaelen.<br><br>She waits. Whatever she is waiting for, he does not have it. He has spent seven years becoming a man who does not have it.'),
    sayThing: S('Say something'),
    sayNothing: S('Say nothing'),
    lyraWipe: S('Whatever you say, it is not the thing. She wipes the slate with the heel of her hand, and gives it back, and turns her face to the dark.'),
    lyraWipe2: S('She wipes the slate with the heel of her hand, and gives it back, and turns her face to the dark.'),
    lyraLater: S('She does not turn her head.'),
    kaelen: S('Kaelen, by the mast'),
    kaelenLook: S('He is looking at the stern, and then at nothing. His glass arm is out of its sleeve, and it hums very faintly, four hours behind and four hundred feet down.'),
    sleepSpot: S('A space in the canvas, in the lee'),
    sleepLook: S('A space in the canvas in the lee of the crates, out of the wind, near the children.'),
    lieDown: S('Lie down until the fourth hour'),
    // the hold
    crate: S('The third crate'),
    crateLook: S('The hold smells of pine and straw and cold glass, and the crates talk among themselves the way they always do. Four hundred murmuring people, stacked in straw.'),
    sit: S('Sit with Kaelen against the third crate'),
    root: S('Kaelen sits on the boards with his back against the third crate and his glass arm out in front of him. Through the arm, faintly, four hours behind and four hundred feet down, he can still hear the Root.<br><br>He had expected it to be gone. It has not stopped. It is singing. Badly, and slowly, and in the wrong place, with two of the five notes missing altogether now, going round and losing itself and starting again, and it is still holding. Whatever was done to it, it has gone on doing the one thing it agreed to do a very long time ago, and is doing it with a hole in it.<br><br>"Somebody has to hold it," he says, not to you. He does not seem to like the shape of it.'),
    vaneDown: S('Vane comes down the ladder with a bottle and sits on the bottom rung. "She\'ll speak again," he says. "I\'ve seen a man lose his voice on a foul tow and get it back inside a month. Not the same voice. But a voice." He drinks. He does not offer the bottle.<br><br>"Thirteen hundred," he says at last. "In two years. Whisper-Grove to the Organum, Whisper-Grove to Fortis, Whisper-Grove to the garrison at Redoubt Zero. I signed for every one, and I knew what was in them by the fourth run, and I kept taking the work, because the Kestrel was four hundred and eighty sovereigns and I had sixty." He looks at you. "That\'s the whole confession. You made me hear it. You can have the rest of it from me, not from the manifests."'),
    vaneLadder: S('Vane comes as far as the top of the ladder and no further. He will not come down into his own hold. He sits on the coaming with a bottle with his boots on the third rung, and does not look at the crates.'),
    tamsin: S('Kaelen takes a cracked lilac sphere out of his coat and sets it on the lid of the crate. "Tamsin Reed," he says. "She spent her last three seconds saying her own name so somebody would have it."'),
    didntHave: S('Vane stands, and stops, with his hand on the ladder. "You didn\'t have to say it," he says to Kaelen. "Up there. I\'d have cut it anyway. I had the axe in my hand and I\'d already done the sum."<br><br>"I know," says Kaelen. "That\'s why I said it."<br><br>Vane stands with his back to him for a moment. "Aye," he says. "I thought that was it." And goes up.'),
    toFourth: S('Wait'),
    // the fourth hour
    fourthTitle: S('The fourth hour'),
    fourth: S('At the fourth hour, Pennick starts screaming.<br><br>The boy is on his knees on the foredeck with a lantern, tearing canvas off the planking, and under the canvas the deck of the Drift-Kestrel has gone green. Not moss. Roots: fine white ones, thousands of them, standing up out of the seams like hair on a cold arm, and swelling as you watch. At the centre of them, sitting with his back to the bow-locker and a blanket over his knees, is Hob Wendle. Three toes short; Rooke took them on Rootday. His boots are gone. What was left of his feet has come open like split fruit, and out of them, into the good dry oak of Vane\'s deck, has gone a mat of roots six feet across.<br><br>"I did try," says Hob. He is perfectly awake. He has been for some time, and did not call out, because he is from Oakhaven and there are children asleep eight feet away. "I kept \'em dry. Like she told me. But it\'s in the wood, see." He looks up at Vane with an expression of unbearable apology. "I\'m sorry about your ship, Captain."<br><br>Kaelen puts his hand into the roots and follows them under the plank. "Two hours," he says. "Maybe three. After that the beams go and she comes apart in the air."'),
    fourthNext: S('Go to him'),
    dropsTitle: S('The long drops'),
    drops: S('Lyra is already on her knees beside him with Rooke\'s little brown bottle in her fist. Three doses left. Hob looks at the bottle, and at her. "Ah," he says. "Right you are, Cantor."<br><br>She opens her mouth, and nothing comes out of it. Not the tending note. Not a rasp. Only air, moving over ruined ground. The third time, her hand goes up to the hole under her jaw where the wire was, and her face comes apart.<br><br>Old Bettany gets down on the boards beside her with her knees cracking. "Give it here, girl. You hold his hand."'),
    holdShoulders: S('Hold his shoulders'),
    humWith: S('Hum the tending note with Bettany'),
    humTitle: S('The tending note'),
    humHint: S('The Root note, low, in the Narrow. For as long as it takes.'),
    cutTitle: S('Over the side'),
    cutYou: S('Bettany gives him the long drops on his tongue, three of them, the way she has watched it done forty times, and then she hums the tending note over him, badly, in the Narrow, for as long as it takes, with a voice like a saw in a knot. You hold his shoulders. He weighs nothing by the end.'),
    cutHum: S('Bettany gives him the long drops on his tongue, three of them, and hums the tending note over him, badly, in the Narrow, with a voice like a saw in a knot, and you hum it under hers, and between you it is very nearly one note. Kaelen holds his shoulders. He weighs nothing by the end.'),
    cutRest: S('They cut him out of the deck with a chisel and a hand-saw, and take up four planks and five feet of good oak beam with him, and put all of it over the side together into the dark, because there is nothing else to be done with a thing that will grow wherever it is put down.<br><br>Vane says the words. He knows them; he has said them a great many times at sea. Then he goes aft to the wheel and will not be spoken to.'),
    seamsGo: S('Take a lamp and a chisel, and help Pennick check the seams'),
    ledgerHob: S('the Kestrel\'s deck'),
    // the seams
    seamsStart: S('Pennick is going round the deck on his hands and knees with a lamp and a chisel, prising up every seam that shows green. Help him before first light.'),
    seam: S('A seam showing green'),
    seamFound: S('You get the chisel under it and prise. Underneath, a white thread of root as long as your finger, already into the beam. Pennick takes it from you without a word and drops it over the rail.'),
    seamsAll: S('You and Pennick have been over every plank. He sits back on his heels, and looks at the deck, and does not find any more.'),
    seamsDawn: S('The sky is greying. Pennick sits back on his heels with the lamp guttering and says he has been over every plank. He has not. You do not tell him.'),
    hudSeams: S('Until first light'),
    // first light
    dawnTitle: S('First light'),
    dawn: S('The Reach goes by underneath, eight hundred feet down in the grey: a country that was fields yesterday. Four miles of canopy where Oakhaven was, and the green running south down the Greenroot road ahead of the light, following the ditches. In the middle of it there is a dirty orange smear that has to be fire, burning in a ring around something.<br><br>Firebreaks. Glass-fire, in the square, burning a ring in the green. The Church came to Oakhaven to purify ground for a Rite, and is down there now burning the ground to save what is left of the people it came to burn.<br><br>"Sir." Tobiah Marsh, with his charts under his arm and the grey look of somebody who has been sitting all night with a thing. "I saw what you put in the port." His voice is shaking, very slightly, and he is working hard to control it. "I was on the rail calling the pitch. You took the plate off the drum and put something in the phase port, and forty seconds later the lock threw. Marten and Old Coyle and the Wendle twins died of slippage, in the summer. I helped carry them up. And you put slippage into that machine on purpose, with two hundred men in the quarry and a Cantor ten feet from the collar." He does not shout. That is worse. "Why?"'),
    tellWhy: S('Tell him why'),
    saySilent: S('Say nothing'),
    toldTob: S('So you tell him, and Kaelen tells him the rest: Stage Nine, and what a wire does to a throat, and what the Rite of Pure Unison was for. And last, because the boy is an engineer and needs the one sentence that makes the rest undeniable, the note in the margin of the Sequence, in a small beautiful hand, under the scales: <i>On failure of the hold, the Sequence is not to be halted. Slippage is to be absorbed by the source.</i><br><br>Tobiah Marsh stands very still. "I\'m not going to tell anyone what you did," he says. "I want you to know I thought about it. All night. I sat with the children and thought about it." He wipes his face with the back of his wrist, once, angrily. "It was a beautiful Sequence, sir. That\'s the worst of it. It\'s the most beautiful piece of engineering I ever read."<br><br>"I know," says Kaelen. "I\'ve thought so for fifteen years."'),
    toldCharts: S('Then he pulls the roll of charts out from inside his shirt, a month of readings and a fair copy of Revision Seven pinned round with a bootlace, and pushes them into your hands. "Take them. They\'ll say it was slippage. That\'s the only copy outside the Organum that has the margin on it. I copied the margin because I thought it was clever."'),
    silentTob: S('You give him nothing. He waits a long time for it. "Then I\'ll work it out," he says at last. "I\'m an engineer. I\'ll work it out from the readings." He goes back to the children with his charts under his arm, and sits with them, and does not look at you again that day.'),
    songGo: S('Go to the stern'),
    // the calling-song
    songTitle: S('The calling-song'),
    song: S('The sun comes up behind the haze, pale as a coin under water. And out of the canopy four miles behind, from a country that has no towns left in it, faint and clear and perfectly in tune, somebody begins to sing the calling-song.<br><br>In Lyra\'s voice. Not the ruined one. The whole one: warm, and round, and patient, the way she sounded on a stone behind a cooperage on forty-one nights, singing lost lambs home to the fold.<br><br>The whole deck hears it. Hetty\'s head comes up. Two of the children begin to cry. Mags, who hears nothing, sees every face on the deck change at once and puts her hand on the axe.<br><br>Lyra is at the stern rail. She does not turn round. She listens to her own voice come up out of the leaves and follow the ship north-east at eight hundred feet, for as long as it goes on, and her hands on the rail do not move.<br><br>After a while it stops. It does not fade. It stops, the way something stops when it has finished doing a thing it meant to do.'),
    standBy: S('Stand beside her, and say nothing'),
    rhyme: S('Once it has your note, the old rhyme goes, it can find you anywhere.'),
    beamCall: S('That night Kaelen goes down into the hold with a lantern and a nub of charcoal.'),
    // the beam
    beam: S('The beam over the third crate'),
    beamBare: S('The underside of the deck-beam over the third crate. Bare oak, adzed smooth.'),
    beamTitle: S('The beam over the third crate'),
    beamText: S('By the light of the lantern, Kaelen writes on the underside of the deck-beam. First the number he wrote on the wall of a charcoal-burner\'s hut every morning for seven years, because it has moved again and there is no wall now to write it on: <b>3½.</b> Then, under it, because somebody has to have them:'),
    beamTam: S('Tam — (no surname. ASK.)'),
    beamPumps: S('8 men at the pumps — no names. FIND THEM.'),
    beamEnd: S('He does not yet know what the list is for. He only knows that somebody has to keep one, and that every single person who ever kept one before him was the Catalogue.'),
    addNames: S('Give him the rest of the names in your ledger'),
    addedNames: S('He holds out the charcoal. You write the rest of yours under his, in your own hand, and he reads each one as it goes up, moving his lips.'),
    coatOn: S('He is wearing the good wool coat from the step of the hut. The left sleeve has been slit to the shoulder to let the glass through. Nobody has asked him where he got it.'),
    giveCoat: S('Give him the coat from the aired room'),
    coatGiven: S('He looks at it for a long time. Then he puts it on, and slits the left sleeve to the shoulder with his knife to let the glass through, and says nothing at all.'),
    flyOn: S('Sleep, and fly on north-east'),
    // the patch in Part Three
    patch: S('A new plank, paler than the rest'),
    patchLook: S('A new plank let into the hold floor, paler than the rest. Pennick found the root under it the second morning, when it had already put up a leaf, and cut it out, and will not talk about it.'),
    // logbook, Part Three card
    jHob: S('Ash in the Hold: at the fourth hour Hob Wendle rooted into the Kestrel\'s deck. "I\'m sorry about your ship, Captain." Bettany hummed the tending note over him, badly, in the Narrow. They put him over the side with four planks and five feet of beam.'),
    jTobTold: S('Tobiah Marsh saw what I put in the phase port. I told him why. "It was a beautiful Sequence, sir."'),
    jTobSilent: S('Tobiah Marsh saw what I put in the phase port. I told him nothing. He says he will work it out from the readings.'),
    jBeam: S('Kaelen has started a list of names on the beam over the third crate in the hold. Every person who ever kept one before him was the Catalogue.'),
    part3: S('For three days the Kestrel goes north-east over the canopy, with a list of names in charcoal on the beam over the third crate.'),
  };
  const HURT = [TX.hurt0, TX.hurt1, TX.hurt2, TX.hurt3];
  // the canon beam, in the book's order (names the game has put in the ledger)
  const BEAM_CANON = ['Tamsin Reed', 'Aldric Vance', 'Davin Hale', 'Orla Hale', 'Hob Wendle', 'Ada Pellow'];

  // ================================================================ art
  function paint() {
    if (typeof Engine === 'undefined' || !Engine.addSprite) return;
    const mk = (name, w, h, hs, draw, o) => {
      if (Engine.sprites && Engine.sprites[name]) return;
      const d = new Uint32Array(w * h);
      const px = (x, y, r, g, b) => { if (x >= 0 && y >= 0 && x < w && y < h) d[y * w + x] = (255 << 24) | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0); };
      draw(px, w, h); Engine.addSprite(name, Object.assign({ w, h, data: d, hs, cx: 0.5, dy: 0 }, o || {}));
    };
    mk('p50_roots', 32, 8, 0.2, (px) => {   // a mat of fine white roots through the seams
      for (let i = 0; i < 160; i++) { const x = (i * 37) % 32, y = 2 + ((i * 11) % 6), k = (i % 5) * 8; px(x, y, 214 - k, 220 - k, 196 - k); if (i % 4 === 0) px(x, y - 1, 120, 168, 90); }
    });
    mk('p50_seam', 24, 6, 0.12, (px) => {   // a deck seam with white threads and a green tip
      for (let x = 0; x < 24; x++) px(x, 3, 40, 30, 22);
      for (let i = 0; i < 18; i++) { const x = 2 + i, y = 2 + (i % 2); px(x, y, 210, 216, 190); }
      px(20, 1, 110, 176, 84); px(21, 1, 110, 176, 84); px(12, 1, 110, 176, 84);
    });
    const beam = (written) => (px, w, h) => {
      for (let y = 6; y < 18; y++) for (let x = 0; x < w; x++) { const n = ((x * 7 + y * 5) % 9) * 2; px(x, y, 104 + n, 74 + n, 46 + n); }
      for (let x = 0; x < w; x++) { px(x, 6, 70, 48, 30); px(x, 17, 60, 40, 26); }
      if (written) for (let r = 0; r < 4; r++) for (let x = 4; x < 4 + 12 + ((r * 7) % 9); x++) if ((x + r) % 3) px(x, 8 + r * 2 + 1, 26, 22, 20);
      if (written) for (let x = 26; x < 32; x++) px(x, 9, 26, 22, 20);
    };
    mk('p50_beam', 40, 20, 0.55, beam(false));
    mk('p50_beam_w', 40, 20, 0.55, beam(true));
    mk('p50_patch', 24, 6, 0.08, (px) => { for (let y = 1; y < 6; y++) for (let x = 2; x < 22; x++) px(x, y, 196, 168, 120); for (let x = 2; x < 22; x++) { px(x, 1, 120, 96, 66); px(x, 5, 120, 96, 66); } });
    mk('p50_fill', 2, 2, 0.01, () => {});
  }
  function paintTex() {
    if (typeof Engine === 'undefined' || !Engine.addTexture || !Engine.textures || Engine.textures.p50_reach) return;
    // the Reach at night, eight hundred feet down: near-black field-strips, the new canopy darker, a faint warm ring far off
    const d = new Uint32Array(64 * 64);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const strip = ((x + (y >> 3) * 5) >> 4) % 3, n = ((x * 13 + y * 7) % 17) / 17;
      let r = 18 + strip * 3 + n * 6, g = 24 + strip * 4 + n * 8, b = 26 + n * 6;
      if (((x * 3 + y * 5) % 61) === 0) { r = 70; g = 52; b = 30; }
      d[y * 64 + x] = (255 << 24) | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0);
    }
    Engine.addTexture('p50_reach', d);
    // the hold's overhead: the underside of the deck planks, tarred seams between them, one squared deck-beam across
    const h = new Uint32Array(64 * 64);
    const OAK = [[30, 20, 13], [42, 28, 17], [54, 37, 23], [66, 46, 29], [80, 57, 36], [96, 70, 44]];
    const put = (x, y, c) => { h[y * 64 + x] = (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]; };
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const row = y & 7, plank = y >> 3, n = ((x * 7 + plank * 31 + ((x >> 3) * 13)) % 11) / 11;
      let k = 2 + (n > 0.62 ? 1 : 0) - (row === 6 ? 1 : 0) + (plank % 3 === 1 ? -1 : 0);
      if (row === 7) k = 0;                                                         // the tarred seam
      if (x >= 26 && x <= 37) {                                                      // the beam, lamp-lit along one arris
        k = x === 26 || x === 37 ? 0 : x === 27 ? 5 : x === 28 ? 4 : x >= 35 ? 1 : 3 - (((y * 5 + x) % 13) === 0 ? 1 : 0);
      } else if ((x === 25 || x === 38) && row !== 7) k = Math.max(0, k - 2);        // the beam's shadow on the planks
      put(x, y, OAK[Math.max(0, Math.min(5, k))]);
    }
    for (let p = 0; p < 8; p++) for (const tx of [30, 33]) { put(tx, p * 8 + 3, OAK[0]); put(tx + 1, p * 8 + 3, OAK[1]); }   // treenails into the beam
    for (let p = 0; p < 8; p++) put((p * 23 + 9) % 24, p * 8 + 4, OAK[0]);                  // a nail-head per plank
    Engine.addTexture('p50_deckhead', h);
  }

  // ================================================================ the maps (new: always built). Ship-local layout as js/kestrel16.js
  const OX = 8, OY = 7, DW = 44, DH = 24;
  const hw = (lx) => (lx < 4 ? 2.0 + lx * 0.35 : lx <= 19 ? 4.5 : 4.5 - (lx - 19) * 0.5);
  const isDeckLocal = (lx, ly) => lx >= 0 && lx <= 27 && ly >= 0 && ly <= 9 && Math.abs(ly + 0.5 - 5) < hw(lx) + 0.01;
  const D = (p) => [OX + p[0], OY + p[1]];
  const AT = {
    arrive: [12.5, 6.4], helm: [3.0, 5.6], vane: [3.6, 6.8], lyra: [1.7, 4.4], kaelen: [17.2, 3.0], mast: [18.5, 4.5], hatch: [12.5, 5.0],
    cask: [6.0, 8.0], awning: [10.8, 1.2], bettany: [10.0, 2.6], hurt: [[8.4, 1.4], [9.6, 1.3], [11.6, 1.4], [12.8, 1.4]], lissa: [14.0, 1.5],
    crates: [15.6, 6.3], hetty: [17.6, 7.3], kids: [[15.4, 7.8], [16.2, 8.2], [17.0, 7.9], [16.4, 7.4]], nell: [13.8, 7.8], pim: [14.3, 8.1],
    sleep: [19.4, 7.8], hob: [23.0, 4.5], roots: [23.5, 4.9], pennick: [24.2, 5.6], mags: [21.6, 6.3], foredeck: [20.6, 4.6],
    tobiah: [9.6, 2.8], dawn: [9.0, 2.0], stern: [2.6, 4.0],
    lamp1: [5.5, 1.4], lamp2: [5.5, 8.6], lamp3: [20.5, 7.6],
    seams: [[6.4, 3.0], [9.3, 6.8], [15.2, 2.2], [20.6, 6.6], [24.4, 5.0]],
  };
  function buildDeck() {
    const m = new GameMap(DECK, TX.deckName, DW, DH, {
      outdoor: true, floor: 'p16k_deck', floorTextures: ['p16k_deck', 'p50_reach', 'p50_reach'], fogDist: 14, fogColor: [16, 18, 24], ambient: 0.22,
      music: 'grove', danger: 0, spawn: { x: OX + AT.arrive[0], y: OY + AT.arrive[1], dir: -PI / 2 },
    });
    m.floorCells.fill(2);
    for (let ly = 0; ly <= 9; ly++) for (let lx = 0; lx <= 27; lx++) if (isDeckLocal(lx, ly)) {
      const x = OX + lx, y = OY + ly;
      const edge = !isDeckLocal(lx - 1, ly) || !isDeckLocal(lx + 1, ly) || !isDeckLocal(lx, ly - 1) || !isDeckLocal(lx, ly + 1);
      if (edge) { m.setFloor(x, y, 2); m.block(x, y, 't_wood', 0.4); } else m.setFloor(x, y, 0);
    }
    m.deco('p16k_mast', ...D(AT.mast), { radius: 0.3, scale: 3.3 });
    m.deco('p16k_helm', ...D(AT.helm), { radius: 0.3, scale: 0.9 });
    m.deco('p16k_hatch', ...D(AT.hatch), { radius: 0.5, scale: 1.0, solid: false, use: 'p50_down', label: TX.hatch });
    m.deco('p16k_awning', ...D(AT.awning), { radius: 0.2, scale: 0.9, solid: false });
    m.deco('p_barrel', ...D(AT.cask), { radius: 0.35, scale: 0.7, use: 'p50_cask', label: TX.cask });
    m.deco('crates', ...D(AT.crates), { radius: 0.45, scale: 0.85 });
    m.deco('crates', AT.crates[0] + OX + 0.9, AT.crates[1] + OY - 0.2, { radius: 0.45, scale: 0.75 });
    m.deco('p22_bedroll', ...D(AT.sleep), { radius: 0.3, scale: 0.6, solid: false, use: 'p50_sleep', label: TX.sleepSpot });
    for (const k of ['lamp1', 'lamp2', 'lamp3']) m.deco('lamp', ...D(AT[k]), { radius: 0.12, scale: 0.7, glow: 0.45 });
    m.baseCount = m.entities.length;
    return m;
  }
  const HOLD_AT = { arrive: [10.0, 4.6], up: [11.2, 5.6], crate: [5.6, 3.0], sit: [6.4, 4.0], beam: [5.6, 1.14] };
  function buildHold() {
    const m = new GameMap(HOLD, TX.holdName, 14, 8, { floor: 'p16k_deck', ceil: 't_wood', fogDist: 12, fogColor: [0, 0, 0], ambient: 0.16, music: 'inside', danger: 0, spawn: { x: HOLD_AT.arrive[0], y: HOLD_AT.arrive[1], dir: PI } });
    m.border('t_wood');
    // overhead is the deck, not a town ceiling: claim the per-cell ceiling before js/ceilings.js gives it plaster and beams
    m.ceilTextures = ['t_wood', 'p50_deckhead']; m._ceilCellsAll = new Uint8Array(m.w * m.h).fill(1); m._ceilAssigned = true;
    for (const [x, y, s] of [[1.6, 1.6, 0.85], [2.6, 1.5, 0.8], [3.6, 1.6, 0.85], [1.6, 3.0, 0.8], [1.5, 4.4, 0.85], [1.6, 5.8, 0.8], [2.8, 6.2, 0.85], [4.2, 6.3, 0.8], [7.6, 1.5, 0.85], [8.8, 1.6, 0.8], [8.4, 6.3, 0.85], [3.2, 3.6, 0.8]]) m.deco('crates', x, y, { radius: 0.4, scale: s });
    m.deco('crates', ...HOLD_AT.crate, { radius: 0.42, scale: 0.85, use: 'p50_crate', label: TX.crate });
    m.deco('p50_beam', ...HOLD_AT.beam, { solid: false, scale: 1.0, radius: 0.1, yOff: -0.35, use: 'p50_beam', label: TX.beam });
    m.deco('ladder', ...HOLD_AT.up, { radius: 0.25, scale: 1.6, use: 'p50_up', label: TX.toDeck });
    m.deco('lamp', 9.2, 4.0, { radius: 0.12, scale: 0.6, glow: 0.4 });
    m.baseCount = m.entities.length;
    return m;
  }
  function buildMaps(maps) {
    paintTex();
    if (!maps[DECK]) maps[DECK] = buildDeck();
    if (!maps[HOLD]) maps[HOLD] = buildHold();
  }

  // ================================================================ staging (transient figures, from the flags)
  const keyed = (m, k) => (m && m.entities || []).find((e) => e && e._p50 === k);
  function put(m, k, e) { const have = keyed(m, k); if (have) return have; Object.assign(e, { transient: true, _decor: true, _p50: k }); m.entities.push(e); return e; }
  function drop(m, pred) { if (!m || !Array.isArray(m.entities)) return; for (let i = m.entities.length - 1; i >= 0; i--) { const e = m.entities[i]; if (e && e._p50 && (!pred || pred(e))) m.entities.splice(i, 1); } }
  function fig(m, k, sprite, local, o) {
    const p = D(local), e = put(m, k, Object.assign({ kind: 'deco', sprite, x: p[0], y: p[1], scale: 1.0, solid: true, radius: 0.28, facing: 0 }, o || {}));
    e.x = p[0]; e.y = p[1]; if (o && o.use) { e.use = o.use; e.label = o.label; }
    return e;
  }
  const spr = (name, alt) => (typeof Engine !== 'undefined' && Engine.sprites && Engine.sprites[name]) ? name : alt;
  function stageDeck(m) {
    if (!m || m.id !== DECK) return;
    const s = stage();
    if (!live()) { drop(m); return; }
    drop(m);
    const fourth = s === 2, dawn = s >= 4;
    fig(m, 'vane', 'vane', AT.vane, { facing: 0 });
    fig(m, 'lyra', 'lyra', AT.lyra, { facing: PI, scale: 0.96, use: 'p50_lyra', label: TX.lyra });
    fig(m, 'kaelen', 'kaelen', fourth ? [22.4, 3.6] : AT.kaelen, { facing: PI, use: 'p50_kaelen', label: TX.kaelen });
    fig(m, 'bettany', 'bettany', fourth ? [22.4, 5.2] : AT.bettany, { facing: PI / 2, scale: 0.9, use: 'p50_bettany', label: TX.bettany });
    for (let i = 0; i < 4; i++) fig(m, 'hurt' + i, i % 2 ? 'townswoman' : 'townsman', AT.hurt[i], { facing: PI / 2, scale: 0.82, radius: 0.22, use: 'p50_hurt', label: HURT[i], hurt: i });
    fig(m, 'lissa', spr('p17c_child', 'pim'), AT.lissa, { facing: PI / 2, scale: 0.66, radius: 0.2, use: 'p50_look', label: TX.lissa, look: TX.lissaLook });
    fig(m, 'hetty', 'hetty', AT.hetty, { facing: PI, use: 'p50_hetty', label: TX.hetty });
    for (let i = 0; i < 4; i++) fig(m, 'kid' + i, spr('p17c_child', 'pim'), AT.kids[i], { facing: -PI / 2, scale: 0.58, solid: false, radius: 0.18 });
    fig(m, 'nell', 'nell', AT.nell, { facing: -PI / 2, scale: 0.95, use: 'p50_look', label: TX.nell, look: TX.nellLook });
    fig(m, 'pim', 'pim', AT.pim, { facing: -PI / 2, scale: 0.62, solid: false, radius: 0.18 });
    fig(m, 'mags', 'mags', fourth ? AT.mags : [20.4, 2.2], { facing: PI });
    fig(m, 'pennick', spr('p16k_pennick', 'townsman'), fourth ? AT.pennick : [7.4, 6.4], { facing: PI, scale: 0.92 });
    if (dawn) fig(m, 'tobiah', 'tobiah', AT.tobiah, { facing: -PI / 2, scale: 0.94 });
    else fig(m, 'tobiah', 'tobiah', [17.8, 6.6], { facing: -PI / 2, scale: 0.94 });
    if (fourth) {
      fig(m, 'hob', 'townsman', AT.hob, { facing: PI, scale: 1.0, glow: 0.2 });
      fig(m, 'roots', 'p50_roots', AT.roots, { solid: false, scale: 1.2, radius: 0.5, glow: 0.3 });
    }
    if (s === 3) {
      const found = fint('p50_sm', 0, 31);
      AT.seams.forEach((p, i) => { if (!(found & (1 << i))) fig(m, 'seam' + i, 'p50_seam', p, { solid: false, scale: 0.9, radius: 0.35, glow: 0.35, use: 'p50_seam', label: TX.seam, seam: i }); });
    }
  }
  function stageHold(m) {
    if (!m || m.id !== HOLD) return;
    drop(m);
    const b = m.entities.find((e) => e && e.use === 'p50_beam');
    if (b) b.sprite = (stage() >= 6 && stage() !== 8) || (stage() === 9 && did(B.beam)) ? 'p50_beam_w' : 'p50_beam';
    if (stage() === 1 && did(B.crate)) put(m, 'kaelen', { kind: 'deco', sprite: 'kaelen', x: HOLD_AT.sit[0], y: HOLD_AT.sit[1], solid: true, radius: 0.28, facing: PI / 2, scale: 0.9 });
    if (stage() === 5) put(m, 'kaelen', { kind: 'deco', sprite: 'kaelen', x: HOLD_AT.sit[0] - 0.4, y: HOLD_AT.sit[1] - 0.6, solid: true, radius: 0.28, facing: -PI / 2, scale: 0.95 });
  }
  // Part Three: the pale plank in the Kestrel's hold, if a seam was missed
  function stagePatch(m) {
    if (!m || m.id !== 'p16k_kestrel_below') return;
    const want = fint('p50_miss', 0, 5) > 0 && stage() === 9;
    const have = keyed(m, 'patch');
    if (want && !have) put(m, 'patch', { kind: 'deco', sprite: 'p50_patch', x: 23.2, y: 10.6, solid: false, radius: 0.3, scale: 1.0, label: TX.patch, use: 'p50_look', look: TX.patchLook });
    if (!want && have) drop(m, (e) => e._p50 === 'patch');
  }
  function restage() { try { if (G.map) { stageDeck(G.map); stageHold(G.map); stagePatch(G.map); } } catch (e) { warnOnce('stage', e); } }

  // ================================================================ the button, and the night
  function begin() {
    if (!hasG() || guest()) { startPart3(); return; }
    try { hide('#ending'); } catch (e) { /* none */ }
    const s = stage();
    if (s === 9 || s === 8 || F().part3) { startPart3(); return; }
    if (live()) { G.state = 'play'; resume(); return; }
    const p = G.player;
    p.hp = p.hpMax; p.voice = p.voiceMax; p.fat = p.fatMax;
    G.dead = false; G.escapeTimer = 0; G.boreHold = 0; G.noise = 0; G.state = 'play';
    G.tod = 22 / 24;
    loadMap(DECK, { x: OX + AT.arrive[0], y: OY + AT.arrive[1], dir: -PI / 2 });
    showEvent(TX.startTitle, TX.start, [
      { t: TX.stay, f: () => { setStage(1); restage(); } },
      { t: TX.sleep, f: () => { setStage(8); startPart3(); } },
    ]);
  }
  function resume() {
    const s = stage();
    if (s === 2) { goDeck(AT.foredeck, 0); restage(); fourthCard(); return; }
    if (s >= 5) { loadMap(HOLD); restage(); return; }
    goDeck(AT.arrive, -PI / 2); restage();
  }
  function goDeck(local, dir) { loadMap(DECK, { x: OX + local[0], y: OY + local[1], dir }); }
  // the wounded
  function useHurt(e) {
    const i = Math.max(0, Math.min(3, Math.floor(Number(e.hurt) || 0))), w = fint('p50_w', 0, 15);
    if (w & (1 << i)) { showEvent(HURT[i], TX.hurtDone, [{ t: TX.leave, f: null }]); return; }
    const p = G.player, ch = [];
    if (F().p50_cup) ch.push({ t: TX.giveWater, f: () => tend(i, TX.watered, () => { F().p50_cup = 0; }) });
    if (G.has && G.has('tonic')) ch.push({ t: TX.giveTonic, f: () => tend(i, TX.tonicked, () => G.take('tonic')) });
    if (p.songs && p.songs.includes('tending') && p.voice >= 8) ch.push({ t: TX.hum, f: () => tend(i, TX.hummed, () => { p.voice -= 8; }) });
    ch.push({ t: TX.leave, f: null });
    showEvent(HURT[i], TX.hurtLook + (ch.length === 1 ? '<br><br>' + TX.noCup : ''), ch);
  }
  function tend(i, line, pay) {
    const w = fint('p50_w', 0, 15); if (w & (1 << i)) return;
    try { pay(); } catch (e) { /* none */ }
    F().p50_w = w | (1 << i);
    if (F().p50_w === 15 && !did(B.tended)) { mark(B.tended); try { questXp(30); } catch (e) { /* none */ } }
    say(line, 'good', 5000);
  }
  function useLyra() {
    if (stage() === 4 || stage() >= 5) { say(TX.lyraLater, '', 3000); return; }
    if (!did(B.lyra1)) { mark(B.lyra1); showEvent(TX.lyra, TX.lyra1, [{ t: TX.leave, f: null }]); return; }
    if (!did(B.lyra2)) {
      showEvent(TX.lyra, TX.lyra1, [{ t: TX.slateOffer, f: () => {
        mark(B.lyra2);
        showEvent(TX.lyra, TX.lyra2, [{ t: TX.sayThing, f: () => say(TX.lyraWipe, '', 6000) }, { t: TX.sayNothing, f: () => say(TX.lyraWipe2, '', 6000) }]);
      } }, { t: TX.leave, f: null }]);
      return;
    }
    say(TX.lyraLater, '', 3000);
  }
  function useHetty() {
    if (!did(B.hetty)) { mark(B.hetty); showEvent(TX.hetty, TX.hettyCount, [{ t: TX.leave, f: null }]); return; }
    say(TX.hettyAgain, 'voice', 3500);
  }
  // the hold
  function useCrate() {
    if (stage() !== 1) { showEvent(TX.crate, TX.crateLook, [{ t: TX.leave, f: null }]); return; }
    showEvent(TX.crate, TX.crateLook, [{ t: TX.sit, f: sitCrate }, { t: TX.leave, f: null }]);
  }
  function sitCrate() {
    if (stage() !== 1) return;
    mark(B.crate); restage();
    const f = F();
    const tamsin = (G.ledger || []).some((r) => r && r.name === 'Tamsin Reed');
    const body = TX.root + '<br><br>' + (f.vane_told ? TX.vaneDown : TX.vaneLadder) + (tamsin ? '<br><br>' + TX.tamsin : '') + '<br><br>' + TX.didntHave;
    showEvent(TX.crate, body, [{ t: TX.toFourth, f: fourthHour }]);
  }
  function lieDown() { if (stage() === 1) fourthHour(); }

  // ================================================================ 2 · the fourth hour
  function fourthHour() {
    if (stage() !== 1) return;
    setStage(2); G.day = (Number(G.day) || 0) + 1; G.tod = 4 / 24;
    goDeck(AT.foredeck, 0); restage();
    try { Audio_.sfx.ui(); } catch (e) { /* silent */ }
    fourthCard();
  }
  function fourthCard() { showEvent(TX.fourthTitle, TX.fourth, [{ t: TX.fourthNext, f: dropsCard }]); }
  function dropsCard() {
    const p = G.player, ch = [{ t: TX.holdShoulders, f: () => overSide(false) }];
    if (p.songs && p.songs.includes('tending') && p.voice >= 8) ch.push({ t: TX.humWith, f: () => { setTimeout(() => humTending(), 0); } });
    showEvent(TX.dropsTitle, TX.drops, ch);
  }
  async function humTending() {
    if (R.holding || stage() !== 2) return;
    R.holding = true;
    try {
      const Rd = (typeof REEDS !== 'undefined' && REEDS && typeof REEDS.holdPitch === 'function') ? REEDS : null;
      if (Rd) await Rd.holdPitch({ curve: [[0, 174 * 1.04], [1.2, 174], [6, 174]], width: (typeof Rd.bandFor === 'function' ? Rd.bandFor(0) : 100) * 1.4, duration: 6, title: TX.humTitle, hint: TX.humHint });
      G.player.voice = Math.max(0, G.player.voice - 8);
    } catch (e) { warnOnce('hum', e); }
    R.holding = false;
    try { if (G.state !== 'play' && !G.openPanel) G.state = 'play'; } catch (e) { /* ok */ }
    overSide(true);
  }
  function overSide(hummed) {
    if (stage() !== 2) return;
    const old = G.ledger || (G.ledger = []);
    if (!old.some((r) => r && r.name === 'Hob Wendle')) old.push({ name: 'Hob Wendle', where: TX.ledgerHob, day: G.day });
    try { journal('main', TX.jHob); } catch (e) { /* none */ }
    F().p50_hum = hummed ? 1 : 0;
    showEvent(TX.cutTitle, (hummed ? TX.cutHum : TX.cutYou) + '<br><br>' + TX.cutRest, [{ t: TX.seamsGo, f: seams }]);
  }

  // ================================================================ 3 · the seams
  function seams() {
    if (stage() !== 2) return;
    setStage(3); F().p50_sm = 0; F().p50_t = 0; R.t = 0;
    G.tod = 4.6 / 24;
    restage();
    say(TX.seamsStart, 'warn', 7000);
  }
  function useSeam(e) {
    if (stage() !== 3) return;
    const i = Math.max(0, Math.min(4, Math.floor(Number(e.seam) || 0)));
    const sm = fint('p50_sm', 0, 31) | (1 << i);
    F().p50_sm = sm;
    drop(G.map, (o) => o._p50 === 'seam' + i);
    say(TX.seamFound, '', 4500);
    if (sm === 31) endSeams();
  }
  function endSeams() {
    if (stage() !== 3) return;
    const sm = fint('p50_sm', 0, 31);
    let found = 0; for (let i = 0; i < 5; i++) if (sm & (1 << i)) found++;
    F().p50_miss = 5 - found;
    if (found === 5) { try { questXp(30); } catch (e) { /* none */ } }
    say(found === 5 ? TX.seamsAll : TX.seamsDawn, '', 7000);
    dawn();
  }
  function tickSeams(dt) {
    R.t += dt;
    if (R.t >= 1) { F().p50_t = Math.min(SEAM_SECS, fint('p50_t', 0, SEAM_SECS) + Math.floor(R.t)); R.t -= Math.floor(R.t); }
    G.tod = Math.min(6 / 24, (4.6 + 1.4 * (fint('p50_t', 0, SEAM_SECS) / SEAM_SECS)) / 24);
    if (fint('p50_t', 0, SEAM_SECS) >= SEAM_SECS) endSeams();
  }

  // ================================================================ 4 · first light; 5 · the calling-song
  function dawn() {
    setStage(4); G.tod = 6.1 / 24;
    goDeck(AT.dawn, -PI / 2); restage();
    showEvent(TX.dawnTitle, TX.dawn, [{ t: TX.tellWhy, f: () => tobiah(true) }, { t: TX.saySilent, f: () => tobiah(false) }]);
  }
  function tobiah(told) {
    if (stage() !== 4) return;
    F().p50_tob = told ? 1 : 2;
    let body = told ? TX.toldTob : TX.silentTob;
    if (told && G.give && G.has && !G.has('charts')) { G.give('charts'); body += '<br><br>' + TX.toldCharts; }
    try { journal('side', told ? TX.jTobTold : TX.jTobSilent); } catch (e) { /* none */ }
    showEvent(TX.dawnTitle, body, [{ t: TX.songGo, f: song }]);
  }
  function song() {
    if (stage() !== 4) return;
    goDeck(AT.stern, PI); restage();
    showEvent(TX.songTitle, TX.song, [{ t: TX.standBy, f: () => {
      setStage(5); mark(B.sung);
      say(TX.rhyme, 'voice', 6000);
      setTimeout(() => say(TX.beamCall, 'warn', 6000), 1800);
      restage();
    } }]);
  }

  // ================================================================ 6 · the beam
  function beamLines() {
    const L = G.ledger || [], names = L.map((r) => r && r.name).filter(Boolean);
    const out = BEAM_CANON.filter((n) => names.includes(n)).map((n) => '<i>' + n + '</i>');
    const tam = F().p49_tam || names.some((n) => /^Tam\b|Old Tam/.test(n));
    if (tam) out.splice(Math.min(out.length, 3), 0, '<i>' + TX.beamTam + '</i>');
    out.push('<i>' + TX.beamPumps + '</i>');
    return out;
  }
  function useBeam() {
    const s = stage();
    if (s !== 5 && s !== 6) { showEvent(TX.beam, s === 9 && did(B.beam) ? TX.beamText + '<br><br>' + beamLines().join('<br>') : TX.beamBare, [{ t: TX.leave, f: null }]); return; }
    const f = F();
    if (s === 5) { setStage(6); mark(B.beam); try { journal('side', TX.jBeam); } catch (e) { /* none */ } restage(); }
    let body = TX.beamText + '<br><br>' + beamLines().join('<br>') + '<br><br>' + TX.beamEnd;
    if (fint('p46_coat', 0, 3) >= 2 || did(B.coat)) body += '<br><br>' + TX.coatOn;
    const ch = [];
    const canon = new Set(BEAM_CANON);
    const extra = (G.ledger || []).map((r) => r && r.name).filter((n) => n && !canon.has(n));
    if (!f.p50_names && extra.length) ch.push({ t: TX.addNames, f: () => { f.p50_names = extra.length; try { questXp(Math.min(40, 5 * extra.length)); } catch (e) { /* none */ } showEvent(TX.beamTitle, TX.addedNames + '<br><br>' + extra.map((n) => '<i>' + n + '</i>').join('<br>'), [{ t: TX.flyOn, f: finish }]); } });
    if (G.has && G.has('p46_coat') && !did(B.coat)) ch.push({ t: TX.giveCoat, f: () => { G.take('p46_coat'); mark(B.coat); showEvent(TX.beamTitle, TX.coatGiven, [{ t: TX.flyOn, f: finish }]); } });
    ch.push({ t: TX.flyOn, f: finish });
    showEvent(TX.beamTitle, body, ch);
  }
  function finish() {
    const s = stage(); if (s !== 6) return;
    setStage(9);
    restage();
    startPart3();
  }

  // ================================================================ uses, HUD, tick, wiring
  function useOwn(e) {
    if (!e || typeof e.use !== 'string' || e.use.indexOf('p50_') !== 0) return false;
    switch (e.use) {
      case 'p50_look': showEvent(e.label || '', e.look || '', [{ t: TX.leave, f: null }]); return true;
      case 'p50_down': loadMap(HOLD); restage(); return true;
      case 'p50_up': goDeck([12.5, 5.9], PI / 2); restage(); return true;
      case 'p50_cask': showEvent(TX.cask, TX.caskLook, live() ? [{ t: TX.fill, f: () => { F().p50_cup = 1; say(TX.filled, '', 3000); } }, { t: TX.leave, f: null }] : [{ t: TX.leave, f: null }]); return true;
      case 'p50_hurt': if (stage() === 1) useHurt(e); else showEvent(e.label || '', TX.hurtLook, [{ t: TX.leave, f: null }]); return true;
      case 'p50_bettany': if (!did(B.bettany)) mark(B.bettany); showEvent(TX.bettany, TX.bettanyTalk, [{ t: TX.leave, f: null }]); return true;
      case 'p50_hetty': useHetty(); return true;
      case 'p50_lyra': useLyra(); return true;
      case 'p50_kaelen': showEvent(TX.kaelen, TX.kaelenLook, [{ t: TX.leave, f: null }]); return true;
      case 'p50_sleep': showEvent(TX.sleepSpot, TX.sleepLook, stage() === 1 ? [{ t: TX.lieDown, f: lieDown }, { t: TX.leave, f: null }] : [{ t: TX.leave, f: null }]); return true;
      case 'p50_crate': useCrate(); return true;
      case 'p50_beam': useBeam(); return true;
      case 'p50_seam': useSeam(e); return true;
      default: return false;
    }
  }
  function drawOverlay() {
    if (!hasG() || G.state !== 'play' || stage() !== 3 || G.mapId !== DECK) return;
    const ctx = Engine.ctx; if (!ctx) return;
    const left = Math.max(0, SEAM_SECS - fint('p50_t', 0, SEAM_SECS));
    ctx.save(); ctx.font = '12px "Alegreya SC", serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#c8e0a0';
    ctx.fillText(TX.hudSeams + ' · ' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'), 160, (typeof VIEW_H === 'number' ? VIEW_H : 150) - 30);
    ctx.restore();
  }
  function tick(dt) {
    if (!hasG() || G.state !== 'play' || guest()) return;
    try { if (stage() === 3 && G.mapId === DECK) tickSeams(dt); } catch (e) { warnOnce('tick', e); }
  }
  function wire() {
    paint();
    if (typeof buildAllMaps === 'function') {
      const _b = buildAllMaps;
      buildAllMaps = function () { const maps = _b.apply(this, arguments); try { buildMaps(maps); } catch (e) { warnOnce('build', e); } return maps; };
    }
    if (typeof update === 'function') { const _u = update; update = function (dt) { const r = _u.apply(this, arguments); try { tick(dt); } catch (e) { warnOnce('update', e); } return r; }; }
    if (typeof drawHUD === 'function') { const _d = drawHUD; drawHUD = function () { const r = _d.apply(this, arguments); try { drawOverlay(); } catch (e) { warnOnce('hud', e); } return r; }; }
    if (typeof useDeco === 'function') { const _ud = useDeco; useDeco = function (e) { try { if (useOwn(e)) return undefined; } catch (err) { warnOnce('use', err); } return _ud.apply(this, arguments); }; }
    for (const fn of ['loadMap', 'restoreGame']) {
      if (typeof window[fn] !== 'function') continue;
      const _f = window[fn];
      window[fn] = function () { const r = _f.apply(this, arguments); if (fn === 'restoreGame') { R.t = 0; R.holding = false; } restage(); return r; };
    }
    // the Part Two ending's button: the night first
    try { const btn = typeof document !== 'undefined' && document.getElementById('btn-part3'); if (btn) btn.onclick = () => { try { begin(); } catch (e) { warnOnce('begin', e); startPart3(); } }; } catch (e) { warnOnce('button', e); }
  }
  try { wire(); } catch (e) { console.warn('ash50 failed to wire', e); }

  // js/grove.js asks this: the night was played, so the Part Three card does not tell it again
  const played = () => hasG() && stage() === 9;

  return { TX, TEXTS, AT, OX, OY, HOLD_AT, DECK, HOLD, SEAM_SECS, R, stage, live, played, begin, sitCrate, fourthHour, overSide, seams, endSeams, dawn, tobiah, song, useBeam, finish, beamLines, restage };
})();
if (typeof window !== 'undefined') window.ASH50 = ASH50;
