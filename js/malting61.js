// ============================================================
//  malting61 — The Malting's front door and the Reach-displaced queue (ROADMAP R9 item 15; Book One ch. 18,
//  ll. 4874–5082; Story Brainstorm #15 and E12).
//
//  The Malting gets its queue-yard, a map between Whisper-Grove's Cloister road door and the Malting's front door:
//    * Sable's shelter, built to her own pamphlet: tarred canvas on a timber frame, forty feet by twelve; benches, a water
//      butt, the man at the trestle with the ticket-book, a clerk walking the line telling everyone, pleasantly, what will
//      be asked. The board: RELIEF STATION — REACH DISPLACED / FOOD · SHELTER · TRANSIT / REGISTRATION REQUIRED (canon).
//    * Under it, people in Reach clothes with Greening mud to the ankle (canon: two carters' smocks, a woman in the grey
//      apron of a dye-works; Ansel Hay, sluice-man on the Flume). [PROPOSED] Among them, Oakhaven's people (the ones who
//      kept the town's hours in js/life60-oakhaven.js): you meet them again four days later, being registered.
//    * The first time you come: the queue, Kaelen's "They walked", Sable's "Registration is the first room", the bell.
//      Then the plan (Vane's, not elegant), and Sable walks in the front. You choose your half:
//        (a) in at the front with Sable: the clerks' hall, the vinegar, Quist's eleven minutes and the desk; "Would you show
//            me a pressing?"; Pressing Room I and Ansel Hay, eight seconds of 741 (canon). You end in the press room with
//            her, where the core of Bettis Renn is on the west shelves (the Bettis scene is js/grove.js's, as before);
//        (b) round to the kiln end with Vane: in by the freight door, into the press room, which is still guarded;
//        (c) stay under the shelter and work the queue [PROPOSED as play]: tell people what is in the first room, and
//            each one you tell walks off into the orchard (one old man will not). Tell one where the clerk can hear, or
//            empty four places, and the clerk counts the benches and walks quickly to the front door: the bell rings
//            early, the hall is awake and the reserve is out when you go in.
//      In every case Sable is in the clerks' hall, so unless the clerk noticed, the hall's proctors are looking at her and
//      not at you (canon: "every person in that building who is not physically holding a subject will come and look").
//    * When the press is out and the bell has rung, the queue has scattered. Sable has a line for what you did to it.
//  Nothing fails. Flags: p61 (1 front, 2 kiln, 3 queue), p61_seen, p61_told (bits), p61_noticed, p61_after.
// ============================================================
'use strict';

const MALTING61 = (function () {
  const TEXTS = [];
  const S = (t) => { TEXTS.push(t); return t; };
  const hasG = () => typeof G !== 'undefined' && G && G.player && G.flags;
  const F = () => G.flags;
  const PI = Math.PI;
  const say = (t, cls, ms) => { try { msg(t, cls || '', ms || 5200); } catch (e) { /* cosmetic */ } };
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; console.warn('malting61: ' + k + ' failed', e); } };
  const guest = () => { try { return typeof SYNC19 !== 'undefined' && !!SYNC19.isGuest(); } catch (e) { return false; } };

  const YARD = 'p61_yard', W = 30, H = 18;
  const WG_DOOR = [32, 5], MALT_WEST = [0, 11], MALT_FREIGHT = [29, 15];
  const NOTICE = 4, NOTICE_DELAY = 8, HEAR = 3.0;

  const TX = {
    yardName: S('The Malting: the queue-yard'),
    toWG: S('Out to the Cloister road'),
    toFront: S('The Malting\'s front door: RELIEF STATION NINETEEN'),
    toFreight: S('The freight door at the kiln end'),
    toYard: S('Out to the queue-yard'),
    goOn: S('Go on.'),
    // the yard
    board: S('A painted board'),
    boardLook: S('Fresh Office lettering on a painted board at the head of the queue:<br><br><b>RELIEF STATION — REACH DISPLACED</b><br><b>FOOD · SHELTER · TRANSIT</b><br><b>REGISTRATION REQUIRED</b>'),
    post: S('Sable\'s shelter'),
    postLook: S('Tarred canvas on a timber frame, forty feet by twelve, built to a specification in a four-page pamphlet with only an initial on it. Page three asks for benches for the old.'),
    bench: S('A bench'),
    benchLook: S('Clean. People hesitate less when the bench is clean.'),
    butt: S('A water butt'),
    buttLook: S('A water butt with a tin cup on a chain. Water, the pamphlet says. A queue that stands thirsty starts asking questions.'),
    trestle: S('The trestle and the ticket-book'),
    trestleLook: S('A ticket-book, half torn through, and a stack of coats and bundles behind the trestle, each with its number. A subject holding a possession will hesitate at the threshold. A subject who has handed it over will not.'),
    orchard: S('The orchard'),
    orchardLook: S('Old apple trees in the fog, and wet grass. Nobody watches the orchard.'),
    // first sight
    arriveTitle: S('There is a queue under the shelter'),
    arrive: S('From the orchard you can see it: the Malting\'s long brick range with its two kiln-chimneys, and in front of it Sable\'s shelter, built to her specification, tarred canvas on a timber frame, forty feet by twelve. Benches. A water butt. A man at a trestle with a ticket-book.<br><br>Under it, people in Reach clothes. Homespun and sacking and good boots caked to the ankle in dried green; two carters\' smocks; a woman in the grey apron of a dye-works. Forty, perhaps fifty of them, with bundles between their feet, and at the head of the queue a painted board in fresh Office lettering: RELIEF STATION — REACH DISPLACED.<br><br>"They walked," Kaelen says. His voice has gone somewhere flat and strange. "Out of the Greening. Down the Greenroot road, that\'s four days on foot. They\'re registering them."<br><br>"They are harvesting them," says Sable. "Registration is the first room."<br><br>The shift-bell rings in the Malting, the seventh hour, and the queue shuffles up two feet, patiently, the way a well-run queue does.'),
    planTitle: S('The plan is Vane\'s'),
    plan: S('It is not elegant. Kaelen, Vane and Mags go in at the kiln end, where the Office\'s freight door stands open for the wagons, and take a press. Mags cannot lift with a broken collarbone, so Mags will hold the door and look enormous. Tobiah runs the tackle.<br><br>And Sable walks in the front.<br><br>"If I present myself at the clerks\' hall, every person in that building who is not physically holding a subject will come and look at me. Including the Registrar-General; that is his carriage in the yard. I am not able to creep in at the back of it. Let me use the only door I can get through."<br><br>Which half is yours?'),
    halfFront: S('Walk in the front with Sable.'),
    halfKiln: S('Go round to the kiln end with Vane.'),
    halfQueue: S('Stay under the shelter, with the queue.'),
    notYet: S('Not yet.'),
    // (a) the front
    hallTitle: S('The clerks\' hall'),
    hall: S('The clerks\' hall smells of ink and wet wool and, faintly, under it, of the vinegar they clean the desks with on the last day of every month. That is the thing that nearly stops her on the threshold.<br><br>Nine clerks look up.<br><br>"Good morning," says Sable. "My name is not on the door of this Office any more, but you will all have seen it at the foot of the intake procedure. I have the Bound Ledger of Whisper-Grove with me. I imagine somebody should be sent for."<br><br>Registrar-General Pellam Quist comes out of the inner office nine seconds later, a small neat elderly man with ink on the side of his hand. "Oh," he says, and for one horrible moment she thinks he is going to be glad. "Oh, my dear girl. You look <i>dreadful</i>. Somebody find her a chair."'),
    deskTitle: S('A desk at the second window'),
    desk: S('He does not threaten her. He sits on the edge of a desk and talks to her for eleven minutes in a soft reasonable voice, and does not once raise it: relief work, the transit warrant, the Legions\' cores that burn out at eleven a month per garrison.<br><br>"You never once wrote down an alternative, my dear. You wrote down the queue."<br><br>"There is a desk free at the second window. You may have it back this afternoon. Nobody will ask you to attend a pressing; I know you never could. I am aware that it sounds like a trap. It is not a trap. It is a desk."<br><br>Sable looks at the door at the far end, with the brass plate that says PRESSING ROOM I.<br><br>"Registrar-General," she says. "Would you show me a pressing?"'),
    withThem: S('Go with them.'),
    pressTitle: S('Pressing Room I'),
    pressAnsel: S('The old malt-store: whitewashed, clean, a drain in the floor, a smell of hot brass. On the stool, a man of about thirty in a Reach smock, with his hands on his knees.<br><br>"Name." "Ansel Hay." "Age." "Thirty-two." "Trade." "Ah — I did the sluices. On the Flume." He swallows. "Is it long, sir? Only they said there\'s food after."<br><br>"There\'s food after," agrees the clerk. "Deep breath, and hold it." And strikes the lever.<br><br>Seven hundred and forty-one hertz. Eight seconds: surprise; a kind of straining, as though he were trying to remember something urgently; and at four, five, six, he begins to look <i>relieved</i>. At seven he stops looking like anybody.<br><br>"Gently now," says the clerk to the second man, and they take him by the elbows and walk him out through the far door into the yard, where he will be given food, because a Hollow eats if the food is put where its loop goes. About a minute and a half. She costed it at ninety seconds in the pamphlet.'),
    pressOther: S('The old malt-store: whitewashed, clean, a drain in the floor, a smell of hot brass. On the stool is somebody from the end of the queue, a carter in a smock, and the clerk asks the three questions kindly, and strikes the lever.<br><br>Seven hundred and forty-one hertz. Eight seconds. "Gently now," says the clerk to the second man, and they walk the carter out through the far door into the yard, where there is food after.<br><br>Ansel Hay is not on the stool. Ansel Hay is in the orchard.'),
    seenTitle: S('"You have seen it"'),
    seen: S('"Now," says Pellam Quist, at her shoulder, not unkindly. "You have seen it."<br><br>"Put one back," says Sable.<br><br>"I beg your—"<br><br>"The press took it. The press can return it." She is already walking to the shelves along the west wall, where the day\'s cores stand in their racks with their tags. "Bettis Renn. Forty thousand one hundred and two. She is in the yard of this building. I saw her carrying baskets on my way in." She finds it: WG-40,102, in a clerk\'s hand, on a string.<br><br>Quist looks at her for a long moment over the half-moon spectacles. "You have never seen it done the other way," he says.<br><br>"No."<br><br>"No," he agrees, softly. "Nor has anyone else alive. Go on, then, my dear. I have wanted to know for thirty years, and I was never going to be the one who tried it."<br><br>They bring Bettis Renn in from the yard.'),
    // Bettis in the yard; brought in to the press room
    bettisName: S('A Hollow with a basket'),
    bettisYard: S('A woman of about forty in a Whisper-Grove apron three years filthy, carrying a basket from one end of the yard to the other. When she sets it down her hands go on making one small gesture: setting something down, and picking it up again.'),
    bettisIn: S('Two of the Malting\'s staff come in from the yard with a Hollow woman between them, a basket still on her arm. Sable has asked for her. "Bettis Renn," somebody says, reading the tag. "Forty thousand one hundred and two."'),
    stay: S('Stay with her.'),
    // (b) the kiln end
    kilnTitle: S('The kiln end'),
    kiln: S('Kaelen gets the kiln-floor door open at the sixth minute and has the tackle rigged by the tenth: a two-fall purchase off the malt-hoist beam, oak, ten by ten. Tobiah runs the fall. Mags stands in the freight doorway with a broken collarbone and a hand-axe and looks enormous.<br><br>A hundred and ten feet away, behind two doors, the clerks\' hall has gone absolutely silent.'),
    goIn: S('In.'),
    // (c) the queue
    queueTitle: S('Under the shelter'),
    queue: S('Sable goes up the yard to the front door with the Ledger at her elbow, and Vane and Kaelen go round to the kiln end, and you stay under the shelter, among the benches she designed.<br><br>A clerk walks the line, pleasantly, telling everyone what will be asked. Name. Age. Trade.<br><br>You could tell them what is in the first room.'),
    // talking to the queue
    tell: S('Tell them what is in the first room.'),
    leave: S('Leave them their place.'),
    // the clerk notices
    noticed: S('The clerk walking the line stops at an empty bench. He counts, and counts again, and then he walks, quickly, not running, up the yard to the front door. Inside the Malting the shift-bell begins to ring, and does not stop.'),
    heard: S('The clerk walking the line has stopped. He heard that. He looks at you for one second, pleasantly, and then he walks, quickly, up the yard to the front door. Inside the Malting the shift-bell begins to ring.'),
    // after
    afterNone: S('The shelter is empty. The bell scattered the queue, and the benches stand in their rows, clean. Sable does not look at the board on her way past it.'),
    afterSome: S('The shelter is empty. Sable stops by the benches for as long as it takes to count them.<br><br>"I wrote that a clerk should walk the line every twenty minutes, telling them what would be asked," she says. "It never once occurred to me that somebody might walk it telling them the truth."'),
    afterNoticed: S('The shelter is empty, and somebody has knocked the board down. "They rang the bell for you before they rang it for us," Sable says. She looks at the orchard, where the fog is. "Good. Let them ring it."'),
    // journal
    jArrive: S('The Malting has a queue. Reach people, four days out of the Greening, sitting on the benches Sable designed under a board that says RELIEF STATION. "Registration is the first room."'),
    jFront: S('I went in at the front with Sable. Quist offered her a desk, and she asked to see a pressing instead, and we watched Ansel Hay, sluice-man on the Flume, go Hollow in eight seconds. "Is it long, sir? Only they said there\'s food after."'),
    jFrontOther: S('I went in at the front with Sable. Quist offered her a desk, and she asked to see a pressing instead, and we watched a carter from the end of the queue go Hollow in eight seconds.'),
    jKiln: S('I went round to the kiln end with Vane while Sable walked in at the front and every clerk in the building came to look at her.'),
    jQueue: S('I stayed under the shelter and walked Sable\'s queue, telling people what is in the first room.'),
    jNoticed: S('The clerk walking the line noticed the empty benches, and the Malting\'s bell rang early. The hall will be awake.'),
    jAfter: S('Some of the queue walked into the orchard before the bell rang. Sable counted the benches.'),
    // the queue's own lines
    clerkName: S('A clerk walking the line'),
    clerkGreet: S('"Name, age and trade, and then the first room. It\'s quite quick. There\'s food after." He smiles. He means it.'),
    clerkBarks: [S('The clerk walking the line, pleasantly: "Name, age, trade. That\'s all they\'ll ask. Name, age, trade."'), S('The clerk, pleasantly: "Have your names ready, please. It goes quicker when you have your names ready."')],
    ticketName: S('The man at the trestle'),
    ticketGreet: S('"Coats and bundles, please, and you\'ll have a ticket. You\'ll get it all back after." He tears a ticket off the book. It has a number on it.'),
    ticketBark: S('The man at the trestle: "Coats and bundles. Thank you. Thank you."'),
    extraName: S('A person of the Reach'),
    extraGreets: [S('They look at you, and then at the door at the head of the queue, and say nothing.'), S('"Four days," she says. "We walked four days." She says it as though somebody ought to write it down.'), S('He has green dried to the knee and a child\'s shoe tied to his bundle by its lace. He does not say whose.'), S('"Transit after, the board says. To where, do you know? Nobody knows where."')],
    extraWarned: [S('They gather their bundle and go into the orchard, and do not look back at the board.'), S('She goes. She takes the tin cup off its chain on the way and nobody stops her.'), S('He goes, with the shoe.'), S('"Nowhere, then," he says, and goes.')],
  };

  // the queue: people of the Reach, some of them Oakhaven's (js/life60-oakhaven.js) four days out of the Greening
  const Q = [
    { key: 'ansel', name: S('Ansel Hay'), sprite: 'p60_man_a', greet: S('"Ansel Hay. I did the sluices, on the Flume." He says it the way you would practise it. "Name, age, trade. That\'s all they ask, the man said. Is it long, do you know? Only they said there\'s food after."'), warned: S('He looks at you for a long moment. "Food after," he says. "They said there was food after." Then he picks up his bundle and goes into the orchard, not quickly, the way a man goes who has nowhere to go to.'), barks: [S('Ansel Hay, to himself: "Ansel Hay. Thirty-two. The sluices."')] },
    { key: 'dyer', name: S('The dyer\'s wife, from Oakhaven'), sprite: 'p60_wom_c', greet: S('The grey apron of a dye-works, and her hands still madder-red to the wrist. "The vats went under with the rest. Four days on the road. They say there\'s transit after."'), warned: S('"I knew," she says. "I think I knew on the road." She takes the apron off and folds it on the bench, and goes.') },
    { key: 'hay', name: S('The hay-carter, from Oakhaven'), sprite: 'p60_man_b', greet: S('A carter\'s smock, green to the knee. "Last of the hay went green on the cart. The horse with it." He looks at the board. "Transit, it says."'), warned: S('He gets up without a word and goes, and does not look back at the board.') },
    { key: 'carter', name: S('A carter from the Flume road'), sprite: 'townsman', greet: S('A carter\'s smock. "Wend\'s Ford, they stopped us. Soldiers, then clerks. The clerks were kinder."'), warned: S('"The clerks were kinder," he says again, and it sounds different this time. He goes.') },
    { key: 'washer', name: S('The washerwoman, from Oakhaven'), sprite: 'townswoman', greet: S('"Clean benches. I\'ll say that for them. Clean benches and a cup on a chain."'), warned: S('"Out," she says, very quietly, the way she used to say it to the stains. "Out." And she goes.') },
    { key: 'vettle', name: S('Vettle\'s wife, from Oakhaven'), sprite: 'p60_wom_b', greet: S('"Vettle went back for the wick-stock. I said leave it. He went back." She holds her bundle in both arms. "They\'ll have lists here. They\'ll know where people are."'), warned: S('She stands up with the bundle still in both arms. "Then he\'s better off where he is," she says, and goes.') },
    { key: 'row', name: S('A goodwife of Cooper\'s Row'), sprite: 'townswoman', greet: S('"I swept the step the morning it came. Swept it, and then the step went green under the broom."'), warned: S('She looks at the door at the head of the queue for a long moment. Then she gets up and goes, and the bench is clean behind her.') },
    { key: 'cooper', name: S('The cooper\'s journeyman, from Oakhaven'), sprite: 'p60_man_c', greet: S('"Barrels float. Did you know? Half the Row went down the Flume on barrels."'), warned: S('"Something that holds," he says. "Right." He goes.') },
    { key: 'old', name: S('An old man, from Oakhaven'), sprite: 'p60_man_a', scale: 0.95, stays: true, greet: S('"Sit, if you\'re sitting. The bench is clean, at least. I\'ve sat on worse benches for longer."'), warned: S('"I know," he says. "I\'ve known since the gate. I\'m old, and my feet are done. Tell the young ones." He does not move.') },
    { key: 'mother', name: S('A young mother, from Oakhaven'), sprite: 'p60_wom_c', greet: S('"Shh. Shh. She settled on the road. She hasn\'t made a sound in four days." She rocks the bundle anyway.'), warned: S('She is up before you finish, the bundle held tight, and into the orchard: not running, because running is noticed.') },
    { key: 'orchard', name: S('An orchard man, from Oakhaven'), sprite: 'p60_man_a', greet: S('"Every tree on the north side went over in one night. You could hear them go. Like doors."'), warned: S('He nods once, as if you had told him the price of something, and goes.') },
    { key: 'fuller', name: S('A fuller, from Oakhaven'), sprite: 'p60_man_c', greet: S('"Food, shelter, transit. Registration required. You go in, and you come out smaller."'), warned: S('He goes. On the bench he leaves a folded square of good thick cloth, as though somebody might need it.') },
  ];
  const EXTRA_SPRITES = ['p60_wom_a', 'townswoman', 'p60_man_b', 'p60_man_a', 'townswoman', 'p60_wom_b', 'p60_man_c', 'townsman'];   // he / she as their lines say

  // ================================================================ art
  function paint() {
    if (typeof Engine === 'undefined' || !Engine.addSprite) return;
    try { if (!Engine.sprites.p61_clerk && typeof LIFE60 !== 'undefined' && LIFE60.variant) LIFE60.variant('townsman', 'p61_clerk', 220, 0.22, 0.6); } catch (e) { warnOnce('clerk', e); }
    if (Engine.sprites.p61_post) return;
    // a timber post under a sagging edge of tarred canvas, with a guy-rope
    const w = 112, h = 72, d = new Uint32Array(w * h);
    const px = (x, y, r, g, b, a) => { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < w && y < h) d[y * w + x] = ((a == null ? 255 : a) << 24) | (b << 16) | (g << 8) | r; };
    let s = 61; const rr = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let y = 8; y < h; y++) for (let x = 54; x < 58; x++) { const k = 60 + ((x === 54) ? -14 : (x === 57) ? -20 : 0) + (rr() * 10 | 0); px(x, y, k + 22, k + 8, k - 6); }
    for (let x = 0; x < w; x++) {
      const sag = 1 + Math.round(4 * Math.sin(PI * (x / w)));
      for (let y = 0; y < 8 + sag; y++) { const k = 26 + (rr() * 12 | 0) + (y === 7 + sag ? -10 : 0); px(x, y, k + 6, k + 4, k); }
      if (rr() < 0.25) px(x, 8 + sag, 16, 14, 12);
    }
    for (let i = 0; i < 18; i++) px(57 + i, 10 + i * 3, 120, 104, 78);   // the guy-rope, off to one side
    Engine.addSprite('p61_post', { w, h, data: d, hs: 1.35, cx: 0.5, dy: 0 });
  }

  // ================================================================ the map
  function look(m, sprite, x, y, label, lookText, o) {
    o = o || {};
    m.deco(sprite, x, y, Object.assign({ radius: o.radius == null ? 0.25 : o.radius, scale: o.scale || 1, label, use: 'p61_look', p61Look: lookText }, o));
  }
  function seats() {   // two rows facing the front door, an aisle between
    const out = [];
    for (let i = 0; i < 11; i++) { out.push([23.3 - i, 8.25]); out.push([23.3 - i, 10.65]); }
    return out;
  }
  function buildYard() {
    const m = new GameMap(YARD, TX.yardName, W, H, { outdoor: true, floor: 't_cobble', floorTextures: ['t_cobble', 't_grass'], fogDist: 15, fogColor: [128, 128, 122], ambient: 0.2, music: 'wild', spawn: { x: 1.6, y: 9.5, dir: 0 } });
    m.border('t_hedge');
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < 10; x++) m.setFloor(x, y, 1);   // the orchard is grass
    m.set(0, 9, DOOR({ portal: { map: 'whispergrove', x: 31.0, y: 5.5, dir: PI }, label: TX.toWG }));
    // the Malting's long brick range along the east side
    m.rect(27, 1, 29, H - 2, 't_house');
    m.set(27, 9, DOOR({ portal: { map: 'malting', x: 1.6, y: 11.5, dir: 0 }, label: TX.toFront }));
    m.set(27, 14, DOOR({ portal: { map: 'malting', x: 28.2, y: 15.5, dir: PI }, label: TX.toFreight }));
    // the orchard: old apple trees, the lane open
    [[3, 3], [6.5, 2.6], [8.6, 5.2], [2.6, 6.4], [5.4, 5.8], [3.2, 13.0], [6.2, 12.6], [8.4, 14.6], [4.6, 15.2], [7.4, 16.0]].forEach(([x, y]) => look(m, 'oak', x, y, TX.orchard, TX.orchardLook, { scale: 1.3, radius: 0.55, solid: true }));
    // Sable's shelter: posts under the canvas edge along both sides
    for (let x = 12; x <= 25; x += 2.2) { look(m, 'p61_post', x, 7.05, TX.post, TX.postLook, { radius: 0.15 }); look(m, 'p61_post', x, 11.85, TX.post, TX.postLook, { radius: 0.15 }); }
    // benches behind each row
    for (let x = 13.3; x <= 23.3; x += 2) { look(m, 'p9p_pew', x, 7.85, TX.bench, TX.benchLook, { scale: 0.7, radius: 0.1, solid: false }); look(m, 'p9p_pew', x, 11.05, TX.bench, TX.benchLook, { scale: 0.7, radius: 0.1, solid: false }); }
    look(m, 'crates', 25.0, 7.6, TX.butt, TX.buttLook, { scale: 0.6, radius: 0.3, solid: true });
    look(m, 'table', 25.4, 11.3, TX.trestle, TX.trestleLook, { scale: 0.6, radius: 0.35, solid: true });
    look(m, 'crates', 26.3, 12.4, TX.trestle, TX.trestleLook, { scale: 0.55, radius: 0.3, solid: true });
    look(m, 'sign', 25.9, 8.1, TX.board, TX.boardLook, { scale: 0.85, radius: 0.2, solid: false });
    look(m, 'lamp', 26.2, 10.4, TX.post, TX.postLook, { scale: 0.6, radius: 0.12, glow: 0.4 });
    m.baseCount = m.entities.length;
    return m;
  }
  // the two doors of the existing maps that now open on the yard
  function syncDoors(maps) {
    const wg = maps.whispergrove, mt = maps.malting;
    if (wg) { const c = wg.get(WG_DOOR[0], WG_DOOR[1]); if (c && c.door && c.portal && c.portal.map === 'malting') c.portal = { map: YARD, x: 1.6, y: 9.5, dir: 0 }; }
    if (mt) {
      const c = mt.get(MALT_WEST[0], MALT_WEST[1]); if (c && c.door && c.portal && c.portal.map === 'whispergrove') { c.portal = { map: YARD, x: 26.3, y: 9.5, dir: PI }; c.label = TX.toYard; }
      const fc = mt.get(MALT_FREIGHT[0], MALT_FREIGHT[1]); if (!fc || !fc.door) mt.set(MALT_FREIGHT[0], MALT_FREIGHT[1], DOOR({ portal: { map: YARD, x: 26.3, y: 14.5, dir: PI }, label: TX.toYard }));
    }
  }
  function buildMaps(maps) {
    if (!maps[YARD]) maps[YARD] = buildYard();
    syncDoors(maps);
  }

  // ================================================================ the queue (people walk off through js/life60.js)
  const told = () => Number(F().p61_told) | 0;
  const isTold = (i) => !!(told() & (1 << i));
  const toldCount = () => { let n = 0; for (let i = 0; i < 20; i++) if (isTold(i) && !(Q[i] && Q[i].stays)) n++; return n; };
  const queueGone = () => !!F().press_taken;
  function roster() {
    const R = [], st = seats(), all = Q.concat(EXTRA_SPRITES.map((sp, i) => ({ key: 'x' + i, name: TX.extraName, sprite: sp, greet: TX.extraGreets[i % 4], warned: TX.extraWarned[i % 4] })));
    all.forEach((q, i) => {
      if (i >= st.length) return;
      const [x, y] = st[i], faceIn = y < 9.4 ? 0.35 : -0.35;   // face up the queue toward the door, a little in toward the aisle
      R.push({
        key: 'q_' + q.key, name: q.name, sprite: q.sprite, scale: q.scale || 1, home: [x, y], exit: [1.6, 9.5],
        day: [{ from: 0, to: 24, job: 'sit', at: [x, y], face: faceIn }], greet: q.greet, barks: q.barks || [],
        away: q.stays ? null : () => isTold(i),
        quest: () => questFor(i, q),
      });
    });
    R.push({ key: 'q_clerk', name: TX.clerkName, sprite: 'p61_clerk', home: [12.6, 9.45], exit: [26.3, 9.5],
      day: [{ from: 0, to: 24, job: 'carry', at: [12.6, 9.45], to2: [25.6, 9.45] }], greet: TX.clerkGreet, barks: TX.clerkBarks,
      away: () => !!F().p61_noticed });
    R.push({ key: 'q_bettis', name: TX.bettisName, sprite: 'hollow', home: [21.4, 13.9], exit: [26.3, 14.5],
      day: [{ from: 0, to: 24, job: 'carry', at: [21.4, 13.9], to2: [25.4, 15.6] }], greet: TX.bettisYard, barks: [],
      away: () => bettisIn() });
    R.push({ key: 'q_ticket', name: TX.ticketName, sprite: 'p61_clerk', home: [25.6, 12.1], day: [{ from: 0, to: 24, job: 'sell', at: [25.6, 12.1], face: -PI / 2 }], greet: TX.ticketGreet, barks: [TX.ticketBark] });
    return R;
  }
  function questFor(i, q) {
    if (isTold(i) || queueGone()) return null;
    return { text: q.greet, choices: [
      { t: TX.tell, f: () => { tellOne(i); return q.warned; } },
      { t: TX.leave, f: () => null },
    ] };
  }
  function tellOne(i) {
    const f = F(); f.p61_told = told() | (1 << i);
    if (!f.p61) f.p61 = 3;
    if (Q[i] && Q[i].stays) return;
    // within earshot of the clerk walking the line?
    try {
      const c = G.ents.find((e) => e && e._life === 'q_clerk' && !e.hidden), me = Engine.cam;
      if (c && !f.p61_noticed && Math.hypot(c.x - me.x, c.y - me.y) < HEAR) { pendingHeard = true; }
    } catch (e) { warnOnce('hear', e); }
  }
  let pendingHeard = false, emptyT = 0;
  function notice(heard) {
    const f = F(); if (f.p61_noticed || f.press_taken) return;
    f.p61_noticed = 1; f.malting_alarm = true;
    say(heard ? TX.heard : TX.noticed, 'bad', 8000);
    try { journal('main', TX.jNoticed); } catch (e) { /* none */ }
    try { Audio_.sfx.bellDie && Audio_.sfx.bellDie(); } catch (e) { /* silent */ }
  }
  function tickYard(dt) {
    if (!hasG() || G.mapId !== YARD || G.state !== 'play' || guest()) return;
    const f = F(); if (f.p61_noticed || f.press_taken) return;
    if (pendingHeard) { pendingHeard = false; notice(true); return; }
    if (toldCount() >= NOTICE) { emptyT += Math.min(0.1, Math.max(0, Number(dt) || 0.033)); if (emptyT >= NOTICE_DELAY) notice(false); } else emptyT = 0;
  }

  // ================================================================ the Malting, as Sable leaves it
  // Book One ch. 18: Bettis Renn is "in the yard of this building ... carrying baskets" until they bring her in.
  // Saves that never saw the yard keep her where she always was, by the press.
  const bettisDone = () => { const f = F(); return !!(f.bettis_awake || f.bettis_kept_awake || f.bettis_put_back); };
  const bettisIn = () => { const f = F(); return !!(f.p61_bettis_in || bettisDone() || f.press_taken); };
  function bringBettis(quiet) {
    const f = F(); if (bettisIn()) return; f.p61_bettis_in = 1;
    if (!quiet) say(TX.bettisIn, 'voice', 7000);
  }
  const pressStaff = (e) => e && e.kind === 'enemy' && (e.room === 'press' || e._p61watch);
  const hallProctor = (e) => e && e.kind === 'enemy' && e.type === 'proctor' && !e.room && !e.requires && e.x >= 10 && e.x <= 19.9 && e.y < 15;
  function syncMalting() {
    if (!hasG() || G.mapId !== 'malting' || !G.map) return;
    const f = F(), drawn = !!f.p61 && !f.p61_noticed && !f.malting_alarm;
    const story = !!(f.part3 && f.wg_plan && f.p61_seen) && !f.press_taken;
    // went in without choosing a half: the plan happened anyway, and Sable walked in the front
    if (story && !f.p61) f.p61 = 2;
    // in the press room (by any door) once Sable is in the building: they bring Bettis Renn in from the yard
    if (story && f.p61 && !bettisIn() && Engine.cam.x >= 21 && Engine.cam.x < 29 && Engine.cam.y >= 10) bringBettis(false);
    const watch = f.p61 === 1 && !f.malting_alarm && !f.press_taken;   // (a): the staff are back, watching; Quist is with her
    for (const e of G.ents) {
      if (e && e.id === 'bettis' && e.kind === 'npc') e.hidden = (f.p61_seen && !bettisIn()) || !!f.bettis_kept_awake;
      if (e && e.id === 'quist' && e.kind === 'npc') { if (watch && !e._p61moved) { e._p61home = [e.x, e.y]; e.x = 24.6; e.y = 16.2; e._p61moved = true; } else if (!watch && e._p61moved) { e.x = e._p61home[0]; e.y = e._p61home[1]; e._p61moved = false; } }
      if (pressStaff(e) && !e.dead && e._p61watch) {
        if (watch) { e.passive = true; e.state = 'passive'; }
        else { e.passive = false; e.state = 'chase'; e.alertT = 6; e._p61watch = false; e.room = 'press'; }
      }
      if (hallProctor(e) && !e.dead) {
        if (drawn) { e.passive = true; e.state = 'passive'; e._p61drawn = true; }
        else if (e._p61drawn) { e.passive = false; e.state = 'chase'; e.alertT = 6; e._p61drawn = false; }
      }
      // the clerk noticed: the reserve is already out when you come in
      if (f.p61_noticed && !f.press_taken && e && e.kind === 'enemy' && e.requires === 'malting_alarm' && !e.dead && !e._p61up) { e.hidden = false; e.state = 'chase'; e.alertT = 6; e._p61up = true; }
    }
  }
  // (a) Book One ch. 18: the two staff walk the pressed man out through the far door into the yard, and come back with
  // Bettis Renn; Quist stays. They stand and watch while Quist is there (not guarding the press: the bell wakes them)
  function staffWatch() {
    try {
      for (const e of G.maps.malting.entities) if (e && e.kind === 'enemy' && e.room === 'press' && !e.dead) { e._p61watch = true; e.room = 'press_watch'; e.passive = true; e.state = 'passive'; }
    } catch (e) { warnOnce('staff', e); }
    bringBettis(true);
  }

  // ================================================================ the scenes
  function enterYard() {
    const f = F();
    if (f.press_taken) {
      if (!f.p61_after && f.p61_seen) {
        f.p61_after = 1;
        const body = f.p61_noticed ? TX.afterNoticed : toldCount() > 0 ? TX.afterSome : TX.afterNone;
        if (toldCount() > 0) try { journal('main', TX.jAfter); } catch (e) { /* none */ }
        showEvent(TX.yardName, body, [{ t: TX.goOn, f: null }]);
      }
      return;
    }
    if (!f.part3 || !f.wg_plan) return;   // only in the story's own time (a teleport or a test room sees the yard, not the scene)
    if (!f.p61_seen) {
      f.p61_seen = 1;
      try { journal('main', TX.jArrive); } catch (e) { /* none */ }
      showEvent(TX.arriveTitle, TX.arrive, [{ t: TX.goOn, f: () => planCard() }]);
      return;
    }
    if (!f.p61) planCard();
  }
  function planCard() {
    showEvent(TX.planTitle, TX.plan, [
      { t: TX.halfFront, f: () => front() },
      { t: TX.halfKiln, f: () => kiln() },
      { t: TX.halfQueue, f: () => queueHalf() },
      { t: TX.notYet, f: null },
    ]);
  }
  const anselGone = () => isTold(0);
  function front() {
    F().p61 = 1;
    showEvent(TX.hallTitle, TX.hall, [{ t: TX.goOn, f: () => showEvent(TX.deskTitle, TX.desk, [{ t: TX.withThem, f: () => pressing() }]) }]);
  }
  function pressing() {
    const ansel = !anselGone();
    if (ansel) { F().p61_ansel = 1; try { if (!G.ledger.some((l) => l && l.name === 'Ansel Hay')) G.ledger.push({ name: 'Ansel Hay', where: 'the Malting, Pressing Room I', day: G.day }); } catch (e) { warnOnce('ledger', e); } }
    try { journal('main', ansel ? TX.jFront : TX.jFrontOther); } catch (e) { /* none */ }
    showEvent(TX.pressTitle, ansel ? TX.pressAnsel : TX.pressOther, [{ t: TX.goOn, f: () => showEvent(TX.seenTitle, TX.seen, [{ t: TX.stay, f: () => {
      staffWatch();
      try { loadMap('malting', { x: 22.6, y: 16.5, dir: PI / 2 }); G.state = 'play'; } catch (e) { warnOnce('front', e); }
    } }]) }]);
  }
  function kiln() {
    F().p61 = 2;
    try { journal('main', TX.jKiln); } catch (e) { /* none */ }
    showEvent(TX.kilnTitle, TX.kiln, [{ t: TX.goIn, f: () => { try { loadMap('malting', { x: 28.2, y: 15.5, dir: PI }); G.state = 'play'; } catch (e) { warnOnce('kiln', e); } } }]);
  }
  function queueHalf() {
    F().p61 = 3;
    try { journal('main', TX.jQueue); } catch (e) { /* none */ }
    showEvent(TX.queueTitle, TX.queue, [{ t: TX.goOn, f: null }]);
  }
  function useOwn(e) {
    if (!e || e.use !== 'p61_look') return false;
    showEvent(e.label || '', e.p61Look || '', [{ t: TX.goOn, f: null }]);
    return true;
  }

  // ================================================================ wiring
  let lastMap = null;
  function onLoad() {
    if (!hasG()) return;
    try { if (G.maps) syncDoors(G.maps); } catch (e) { warnOnce('doors', e); }
    // the clerk's colours are made only where a clerk walks: a new sprite part-way through a session would move the
    // others in the texture atlas and change every other map's pixels
    if (G.mapId === YARD || G.mapId === 'whispergrove') paint();
    if (G.mapId === 'malting') syncMalting();
    if (G.mapId === YARD && lastMap !== YARD) { emptyT = 0; pendingHeard = false; try { if (!guest()) enterYard(); } catch (e) { warnOnce('enter', e); } }
    lastMap = G.mapId;
  }
  function wire() {
    // no sprites are made here: one made at script load lands in the texture atlas ahead of the game's own and moves
    // them (frames elsewhere change); they are made when the yard or the city is first loaded
    if (typeof buildAllMaps === 'function') {
      const _b = buildAllMaps;
      buildAllMaps = function () { const maps = _b.apply(this, arguments); try { buildMaps(maps); } catch (e) { warnOnce('build', e); } return maps; };
    }
    if (typeof useDeco === 'function') { const _ud = useDeco; useDeco = function (e) { try { if (useOwn(e)) return undefined; } catch (err) { warnOnce('use', err); } return _ud.apply(this, arguments); }; }
    if (typeof updateNarrow === 'function') { const _un = updateNarrow; updateNarrow = function (dt) { const r = _un.apply(this, arguments); try { tickYard(dt); if (G.mapId === 'malting' && G.state === 'play') syncMalting(); } catch (e) { warnOnce('tick', e); } return r; }; }
    for (const fn of ['loadMap', 'restoreGame']) {
      if (typeof window[fn] !== 'function') continue;
      const _f = window[fn];
      window[fn] = function () { const r = _f.apply(this, arguments); try { onLoad(); } catch (e) { warnOnce(fn, e); } return r; };
    }
    try { if (typeof LIFE60 !== 'undefined') LIFE60.add(YARD, roster(), { gone: queueGone }); } catch (e) { warnOnce('queue', e); }
  }
  try { wire(); } catch (e) { console.warn('malting61 failed to wire', e); }

  return { TX, TEXTS, Q, YARD, bettisIn, bringBettis, seats, roster, buildYard, syncDoors, syncMalting, enterYard, planCard, front, kiln, queueHalf, tellOne, notice, toldCount, NOTICE };
})();
if (typeof window !== 'undefined') window.MALTING61 = MALTING61;
