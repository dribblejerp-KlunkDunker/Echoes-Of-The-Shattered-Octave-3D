// ============================================================
//  governor46 — Release road R5 #5: the Governor's house, above the square (Book One ch. 2).
//
//    * THE HOUSE: the north-row door beside the Greenhall that stood shuttered once the Carders moved behind the tannery
//      (js/hollow30.js). Kaelen's birthplace (data.js: "born in the Governor's house above the square"). The step Aldric
//      stood on the winter Kaelen came home, and the gate Kaelen stood at: "the town told it both ways" (ch. 2). A long
//      table laid for one. Marrit Pell, the housekeeper [PROPOSED: her name and her part], who airs the room.
//    * ALDRIC'S HIDDEN ROOTS (ch. 2: "beneath the linen's edge, pale as a grub, a root-tip ... The Grafters are discreet
//      with the Governor. Twice a month, now"): his dressing-table, with the basin, the linen squares cut to a thumb's
//      width, the comb, the hand-glass turned face down, and the Grafters' note [PROPOSED wording]. His desk: the lease
//      worn soft at the signature, and the winter's list in his own hand ("the Wetherby twins, and the Hale girl, and the
//      miller's three, and eleven more").
//    * THE AIRED ROOM (ch. 2: "Your room's as you left it. I had them air it every spring."): the bed made, the window
//      open on the latch on a day that is not spring, a boy's drawings of bores ("You drew the pictures, boy"), the
//      Conservatory's letter in a frame, and a coat on the peg.
//    * "THE COAT ON THE PEG" [PROPOSED: the errand, from the Story Brainstorm §16]: once you have seen the room, Aldric
//      asks you to take the coat out to the hut and leave it on the step. Kaelen leaves it there, unopened, and says
//      nothing. Tell Aldric, and he says "No. I didn't think he would." (Flag p46_coat; R9's Ash in the Hold reads it.)
//
//  Playable in Parts One and Two only, like everything new in Oakhaven: from the Greening on, the door is shut under the
//  green and the errand closes with one logbook line. The two maps are new and always built (a save may stand in one);
//  nothing draws on the random stream, and nothing is added to an old map's entity list (the parcel on the hut's step is
//  a transient entity, placed from the flags).
// ============================================================
'use strict';

const GOVERNOR46 = (function () {
  const TEXTS = [];
  const S = (t) => { TEXTS.push(t); return t; };
  const hasG = () => typeof G !== 'undefined' && G && G.map && G.player;
  const F = () => (hasG() && G.flags) || {};
  const gone = () => { const f = F(); return !!(f.greening || f.escaped || f.part3 || f.part4); };
  const here = () => (hasG() ? G.mapId : null);
  const say = (t, cls, ms) => { try { msg(t, cls || '', ms || 4500); } catch (e) { /* cosmetic */ } };
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; console.warn('governor46: ' + k + ' failed', e); } };
  const guest = () => { try { return typeof SYNC19 !== 'undefined' && !!SYNC19.isGuest(); } catch (e) { return false; } };
  const PI = Math.PI;

  const MAPS = { house: 'p46_house', room: 'p46_room' };
  const OAK = 'oakhaven', CLEARING = 'clearing';
  const OAK_DOOR = [37, 7];        // the north row, next door to the Greenhall (maps.js: the old Carders' house, shuttered since R5a)
  const HUT_DOOR = [11, 16];       // Kaelen's hut in the clearing (maps.js buildClearing)
  const STEP = { x: 11.78, y: 16.5 };
  const COAT = 'p46_coat';

  const TX = {
    leave: S('Leave it.'),
    house: S('The Governor\'s house'),
    room: S('The aired room'),
    // doors
    toHouse: S('The Governor\'s house'),
    toSquare: S('Out to the square'),
    upStair: S('The stair up'),
    downStair: S('Down to the hall'),
    greened: S('The Governor\'s house. Root has come through the shutters from the inside, and the door will not move.'),
    // the hall
    step: S('The doorstep'),
    stepLook: S('A worn sandstone step, scrubbed. The winter Kaelen came home, an old man stood on it with the door open behind him and the warm light spilling out, and a young man with his arm in a sling of glass stood at the gate in the snow, and the two of them looked at each other across the yard for as long as it took the snow to cover the young man\'s shoulders. The town tells it both ways: that the son never came to the door, and that the father never came to the gate. Both are true.'),
    table: S('A long table, laid for one'),
    tableLook: S('A table for twelve, laid at the head for one: a plate, a cup, a knife, a heel of the Consortium\'s bread. The other chairs are pushed in square. There is dust on their seats and none on his.'),
    hearth: S('The hall hearth'),
    hearthLook: S('A good fire, kept low and quiet the way every fire in the Reach is kept now. Over the mantel, a pale square on the plaster where a picture hung for a long time and does not now.'),
    // the study: the lease, the list
    desk: S('The Governor\'s desk'),
    deskLook: S('His copy of the Consortium\'s lease, in a folder of green leather. The pages are clean except the last, which has gone soft as cloth at the corner from being turned back to, and the signature on it, which is steady.<br><br>Under the folder, a sheet in the same hand, headed only with the winter: the Wetherby twins. The Hale girl. The miller\'s three. And eleven more names under those, each with the ground it went into, and a note against four of them: fires burned two days before the spade would go in.'),
    // the dressing-table: the roots
    dressing: S('A dressing-table'),
    dressingLook: S('A basin of water gone cold, and beside it a stack of clean linen squares, each cut to a thumb\'s width and no more. A comb with long grey hair in it, and wound in the grey, very fine, one white thread that is not hair: it has a tip, and it is turned toward the window. The hand-glass lies face down.'),
    chit: S('A folded note under the basin'),
    chitLook: S('Heavy paper, no seal. The Governor. Second and fourth Rootday, by the garden door, before the wagon. Burn this. Somebody has not burned it. Somebody has folded it very small and kept it under the basin, where it is the first thing he sees in the morning.'),
    rootsFound: S('The Governor is putting out roots. Twice a month the Grafters come to the garden door, and he hides it under his hair.'),
    // the aired room
    bed: S('A bed, made'),
    bedLook: S('A boy\'s bed, made tight, the sheets turned down a hand\'s width the way a housekeeper does it. They smell of cold air and lavender. They were changed this week.'),
    window: S('The window, open on the latch'),
    windowLook: S('The casement is open on its latch, and the curtain moves in the draught off the orchards. Someone opened it this morning. It is not spring.'),
    drawings: S('Drawings pinned to the wall'),
    drawingsLook: S('A boy\'s drawings, pinned edge to edge from the desk to the ceiling: the mill-race, the Chapel bell in section, a pump with every valve numbered, and, lowest and oldest, a bore going down through ruled strata to a root drawn like a heart. Underneath, in a careful nine-year-old\'s hand: 174.'),
    letter: S('A framed letter'),
    letterLook: S('The Conservatory of Bores begs to inform Master Kaelen Vance of Oakhaven that he has been accepted. The frame is better than the letter, and was bought later. The glass has been dusted on the inside.'),
    coat: S('A coat on the peg'),
    coatLook: S('A good wool coat, a young man\'s, cut close for the Organum winters. It is from before. The left sleeve was cut for an arm of flesh. You leave it where it hangs.'),
    coatAsk: S('A good wool coat, a young man\'s, cut close for the Organum winters. The Governor asked you to take it to the hut.'),
    takeCoat: S('Take it down and fold it over your arm'),
    tookCoat: S('You fold the coat over your arm. It is heavier than it looks, and it smells of the room.'),
    peg: S('An empty peg'),
    pegLook: S('An empty peg, and a paler patch on the plaster in the shape of a coat.'),
    roomSeen: S('His room is as he left it. The Governor has had it aired every spring, and this year he has had it aired again, in autumn.'),
    // Marrit Pell [PROPOSED]
    marritName: S('Marrit Pell, housekeeper to the Governor'),
    marritGreet: S('Wipe your boots. He\'s at the Greenhall, if it\'s him you want. He mostly is.'),
    marritRoom: S('I air it every spring. He has me do it. He had me do it again on Massday, and it isn\'t spring, and I didn\'t say so, and neither did he. Go up if you want. Mind the third stair.'),
    marritRoots: S('I don\'t go in his dressing-room, and if I did I wouldn\'t say what I saw there. They come to the garden door, not the front. He has the courtesy to let me be out.'),
    marritKaelen: S('I bathed that boy. I know what he looks like from the back walking off up the North Gate road in the snow, and so does the whole town, and so does his father, from the step.'),
    // the hut
    hut: S('Kaelen\'s hut'),
    hutBody: S('A charcoal-burner\'s hut. Inside, one low note, over and over. The coat is folded over your arm.'),
    leaveCoat: S('Put it down on the step'),
    leftCoat: S('You put the coat down on the step of the hut, square to the door. Kaelen sees it. He doesn\'t pick it up and he doesn\'t open it, and he says nothing at all.'),
    parcel: S('A coat on the step of the hut, folded'),
    parcelLook: S('The coat lies where you left it, folded square, with dew on it. It has not been moved. Something about the way it has not been moved is deliberate.'),
    // Aldric
    aldricAsk: S('He waits until the Factor has gone to the window. "Marrit tells me you\'ve been up to his room." He does not look at you. "I had it aired again. This week. It isn\'t spring. I know it isn\'t spring." A breath. "There\'s a coat on the peg. The good one; he went to the Organum in it. Take it out to him. Leave it on the step. Don\'t say who sent it." His hand goes to his left temple and he makes it come down again. "He\'ll know."'),
    aldricWell: S('"Well?"'),
    toldStep: S('He put it on the step. He didn\'t open it.'),
    toldNo: S('"No." The Governor looks at the table for a while. "I didn\'t think he would."'),
    notYet: S('Not yet.'),
    notYetReply: S('"No. Take your time. He has." He turns back to his papers.'),
    // the logbook
    jAsk: S('The Coat on the Peg: the Governor asked me to take Kaelen\'s old coat from the aired room out to the hut, and leave it on the step without saying who sent it.'),
    jLeft: S('I left the coat on the step of Kaelen\'s hut. He didn\'t open it. The Governor will want to know, though he won\'t ask.'),
    jDone: S('The Coat on the Peg: I told the Governor his son left the coat on the step unopened. "No. I didn\'t think he would."'),
    jClosedCarry: S('Oakhaven is behind me, and I still have Kaelen\'s old coat. I never took it out to the hut.'),
    jClosedLeft: S('Oakhaven is behind me. I never told the Governor that his son left the coat on the step. He didn\'t need telling.'),
    jClosedNone: S('Oakhaven is behind me. The coat is still on the peg in the aired room, under the green now with the rest of the house.'),
    coatItem: S('Kaelen\'s old coat'),
    coatDesc: S('A good wool coat, a young man\'s, cut close for the Organum winters. The left sleeve was cut for an arm of flesh.'),
  };

  // Marrit's topics answer the game's own topic list
  const P = {
    p46_marrit: { name: TX.marritName, sprite: 'townswoman', portrait: 'townswoman', tier: 'low', scale: 0.93, quest: () => null,
      greet: { polite: TX.marritGreet, normal: TX.marritGreet, blunt: S('Boots. Then talk.') },
      topics: { 'Governor Vance': TX.marritRoots, 'Kaelen Vance': TX.marritKaelen, 'Oakhaven': TX.marritRoom } },
  };
  const ITEM_DEFS = { [COAT]: { name: TX.coatItem, sprite: 'p46_parcel', key: true, desc: TX.coatDesc } };

  // ================================================================ sprites (procedural stand-ins)
  function paint() {
    if (typeof Engine === 'undefined' || !Engine.addSprite) return;
    const mk = (name, draw, o) => {
      if (Engine.sprites && Engine.sprites[name]) return;
      const w = 24, h = 24, d = new Uint32Array(w * h);
      const px = (x, y, r, g, b) => { if (x >= 0 && y >= 0 && x < w && y < h) d[y * w + x] = (255 << 24) | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0); };
      draw(px); Engine.addSprite(name, Object.assign({ w, h, data: d, hs: 1, cx: 0.5, dy: 0 }, o || {}));
    };
    mk('p46_window', (px) => {   // a casement open on its latch, the curtain blown in
      for (let y = 2; y < 22; y++) for (let x = 5; x < 19; x++) {
        const frame = x === 5 || x === 18 || y === 2 || y === 21 || y === 11;
        if (frame) px(x, y, 118, 92, 66); else { const k = (y - 2) / 20; px(x, y, 150 + k * 30, 170 + k * 20, 186 - k * 10); }
      }
      for (let y = 3; y < 21; y++) { const sway = Math.round(Math.sin(y / 3) * 1.5); for (let x = 6; x < 10 + sway; x++) px(x, y, 226, 220, 206); }
      for (let y = 3; y < 11; y++) px(13 + ((y / 3) | 0), y, 96, 76, 56);   // the casement, swung in
    });
    mk('p46_coat', (px) => {   // a wool coat on a peg
      const c = [70, 74, 92], dk = [50, 52, 66];
      px(11, 2, 80, 60, 40); px(12, 2, 80, 60, 40);
      for (let y = 3; y < 21; y++) { const half = y < 6 ? 2 + y : Math.min(8, 6 + ((y - 6) >> 2)); for (let x = 12 - half; x < 12 + half; x++) px(x, y, ...((x === 12 - half || x === 11 + half) ? dk : c)); }
      for (let y = 6; y < 16; y++) px(11, y, ...dk);
      for (const y of [8, 11, 14]) px(13, y, 168, 150, 96);
    });
    mk('p46_parcel', (px) => {   // the coat folded square, as an item or on the step
      for (let y = 14; y < 21; y++) for (let x = 5; x < 19; x++) px(x, y, ...(y === 14 || y === 20 || x === 5 || x === 18 ? [50, 52, 66] : [70, 74, 92]));
      for (let x = 5; x < 19; x++) px(x, 17, 58, 62, 78);
      px(16, 15, 168, 150, 96);
    });
    mk('p46_dressing', (px) => {   // a dressing-table: basin, linen squares, the hand-glass face down
      for (let x = 3; x < 21; x++) for (let y = 12; y < 15; y++) px(x, y, 110, 78, 50);
      for (const x of [4, 19]) for (let y = 15; y < 23; y++) px(x, y, 88, 60, 38);
      for (let x = 6; x < 12; x++) for (let y = 9; y < 12; y++) px(x, y, ...(y === 9 ? [210, 214, 216] : [170, 176, 180]));
      for (let x = 13; x < 16; x++) for (let y = 10; y < 12; y++) px(x, y, 236, 232, 222);
      for (let x = 16; x < 20; x++) px(x, 11, 70, 52, 36); px(17, 10, 70, 52, 36); px(18, 10, 70, 52, 36);
      for (let y = 3; y < 9; y++) for (let x = 7; x < 11; x++) px(x, y, 150, 140, 120);
    });
    mk('p46_desk', (px) => {   // a governor's desk with a green folder
      for (let x = 2; x < 22; x++) for (let y = 12; y < 15; y++) px(x, y, 96, 66, 40);
      for (const x of [3, 20]) for (let y = 15; y < 23; y++) px(x, y, 76, 52, 32);
      for (let x = 6; x < 14; x++) for (let y = 9; y < 12; y++) px(x, y, 46, 86, 54);
      for (let x = 14; x < 19; x++) for (let y = 10; y < 12; y++) px(x, y, 226, 218, 196);
      for (let y = 4; y < 12; y++) px(19, y, 120, 110, 90); for (let x = 17; x < 22; x++) for (let y = 2; y < 5; y++) px(x, y, 250, 210, 120);
    });
    mk('p46_drawings', (px) => {   // a wall of pinned drawings
      for (let i = 0; i < 6; i++) { const x0 = 2 + (i % 3) * 7, y0 = 2 + ((i / 3) | 0) * 9; for (let y = y0; y < y0 + 7; y++) for (let x = x0; x < x0 + 6; x++) px(x, y, 222 - i * 4, 214 - i * 4, 190 - i * 3); px(x0 + 3, y0 + 3, 60, 56, 70); px(x0 + 3, y0 + 4, 60, 56, 70); px(x0 + 2, y0 + 5, 60, 56, 70); }
      for (let y = 20; y < 23; y++) for (let x = 8; x < 16; x++) px(x, y, 210, 200, 176);
    });
  }

  // ================================================================ the maps (new maps: always built)
  const look = (m, sprite, x, y, label, text, o) => m.deco(sprite, x, y, Object.assign({ radius: 0.3, scale: 0.7, label, use: 'p46_look', look: text }, o || {}));
  const OUT_OAK = { x: OAK_DOOR[0] + 0.5, y: OAK_DOOR[1] + 1.6, dir: PI / 2 };
  const HW = 16, HH = 11;
  function buildHouse() {
    const m = new GameMap(MAPS.house, TX.house, HW, HH, { floor: 't_wood', ceil: 't_wood', fogDist: 16, ambient: 0.3, fogColor: [0, 0, 0], music: 'inside', spawn: { x: 8.5, y: 9.0, dir: -PI / 2 } });
    m.border('t_house');
    m.set(8, HH - 1, DOOR({ portal: { map: OAK, x: OUT_OAK.x, y: OUT_OAK.y, dir: OUT_OAK.dir }, label: TX.toSquare }));
    m.set(6, 0, DOOR({ portal: { map: MAPS.room, x: 4.5, y: 5.0, dir: -PI / 2 }, label: TX.upStair }));
    // the study and dressing-room behind a partition on the west, with a doorway
    for (let y = 1; y < HH - 1; y++) if (y !== 5) m.set(4, y, WALL('t_house'));
    m.set(4, 5, DOOR({}));
    m.deco('p46_desk', 2.0, 2.0, { radius: 0.5, scale: 0.85, use: 'p46_look', label: TX.desk, look: TX.deskLook });
    m.deco('chair', 2.6, 3.2, { radius: 0.2, scale: 0.5 });
    m.deco('p46_dressing', 2.0, 8.2, { radius: 0.5, scale: 0.85, use: 'p46_dressing', label: TX.dressing });
    look(m, 'sign', 1.3, 7.3, TX.chit, TX.chitLook, { solid: false, scale: 0.3, radius: 0.15, use: 'p46_dressing' });
    m.deco('lamp', 3.4, 5.5, { radius: 0.12, scale: 0.55, glow: 0.45, solid: false });
    // the hall
    look(m, 'table', 10.5, 4.5, TX.table, TX.tableLook, { scale: 0.85, radius: 0.6 });
    for (const [x, y] of [[8.4, 3.6], [8.4, 5.4], [12.6, 3.6], [12.6, 5.4]]) m.deco('chair', x, y, { radius: 0.2, scale: 0.5 });
    m.deco('chair', 10.5, 2.9, { radius: 0.2, scale: 0.5 });
    look(m, 'hearth', 14.8, 2.4, TX.hearth, TX.hearthLook, { radius: 0.3, scale: 0.9, glow: 0.7 });
    m.deco('lamp', 13.5, 8.5, { radius: 0.12, scale: 0.7, glow: 0.6, solid: false });
    m.deco('shelf', 14.6, 6.5, { radius: 0.2, scale: 0.9 });
    look(m, 'sign', 8.5, 9.35, TX.step, TX.stepLook, { solid: false, scale: 0.01, radius: 0.5 });
    m.npc('p46_marrit', 12.5, 7.6, { facing: PI });
    m.baseCount = m.entities.length;
    return m;
  }
  function buildRoom() {
    const m = new GameMap(MAPS.room, TX.room, 9, 7, { floor: 't_wood', ceil: 't_wood', fogDist: 14, ambient: 0.34, fogColor: [0, 0, 0], music: 'inside', spawn: { x: 4.5, y: 5.0, dir: -PI / 2 } });
    m.border('t_house');
    m.set(4, 6, DOOR({ portal: { map: MAPS.house, x: 6.5, y: 1.6, dir: PI / 2 }, label: TX.downStair }));
    look(m, 'bed', 7.0, 1.9, TX.bed, TX.bedLook, { radius: 0.5, scale: 0.6 });
    look(m, 'p46_window', 4.5, 1.14, TX.window, TX.windowLook, { solid: false, scale: 1.0, radius: 0.1 });
    look(m, 'p46_drawings', 1.14, 2.6, TX.drawings, TX.drawingsLook, { solid: false, scale: 1.0, radius: 0.1 });
    look(m, 'table', 1.6, 4.2, TX.letter, TX.letterLook, { radius: 0.45, scale: 0.65 });
    m.deco('chair', 2.6, 4.6, { radius: 0.2, scale: 0.5 });
    m.deco('p46_coat', 7.8, 4.6, { solid: false, scale: 0.85, radius: 0.15, use: 'p46_coat', label: TX.coat });
    m.deco('lamp', 6.0, 5.4, { radius: 0.12, scale: 0.55, glow: 0.45, solid: false });
    m.baseCount = m.entities.length;
    return m;
  }
  function syncOak(oak) {
    if (!oak || oak.id !== OAK || oak.w !== 70 || oak.h !== 64) return;
    const [x, y] = OAK_DOOR, c = oak.get(x, y);
    if (gone()) { if (!c || c.lockMsg !== TX.greened) oak.set(x, y, DOOR({ locked: '__never', lockMsg: TX.greened, label: TX.toHouse })); return; }
    if (!c || !c.portal || c.portal.map !== MAPS.house) oak.set(x, y, DOOR({ portal: { map: MAPS.house, x: 8.5, y: 9.0, dir: -PI / 2 }, label: TX.toHouse }));
  }
  function buildMaps(maps) {
    if (!maps[MAPS.house]) maps[MAPS.house] = buildHouse();
    if (!maps[MAPS.room]) maps[MAPS.room] = buildRoom();
    syncOak(maps[OAK]);
  }

  // ================================================================ the errand
  const stage = () => { const v = Number(F().p46_coat); return Number.isFinite(v) ? Math.max(0, Math.min(3, Math.floor(v))) : 0; };
  function useCoat(e) {
    const f = F();
    if (stage() >= 1) { showEvent(TX.peg, TX.pegLook, [{ t: TX.leave, f: null }]); return; }
    if (!f.p46_ask || gone()) { showEvent(TX.coat, TX.coatLook, [{ t: TX.leave, f: null }]); return; }
    showEvent(TX.coat, TX.coatAsk, [{ t: TX.takeCoat, f: () => takeCoat(e) }, { t: TX.leave, f: null }]);
  }
  function takeCoat(e) {
    const f = F(); if (stage() >= 1 || !f.p46_ask) return;
    f.p46_coat = 1;
    if (!G.has(COAT)) G.give(COAT);
    if (e) { e.sprite = 'sign'; e.scale = 0.01; e.label = TX.peg; }
    say(TX.tookCoat, 'good', 4000);
  }
  function syncPeg(m) {
    if (!m || m.id !== MAPS.room) return;
    const e = m.entities.find((o) => o && o.use === 'p46_coat');
    if (e && stage() >= 1 && e.sprite !== 'sign') { e.sprite = 'sign'; e.scale = 0.01; e.label = TX.peg; }
  }
  function useDressing() {
    const f = F();
    if (!f.p46_roots) { f.p46_roots = true; try { journal('side', TX.rootsFound); } catch (e) { /* none */ } }
    showEvent(TX.dressing, TX.dressingLook + '<br><br>' + TX.chitLook, [{ t: TX.leave, f: null }]);
  }
  // the hut: the step takes the coat
  function atHutDoor() {
    if (!hasG() || here() !== CLEARING || stage() !== 1 || !G.has(COAT) || gone()) return false;
    let w = null; try { w = Engine.pickWall(2.0); } catch (e) { w = null; }
    return !!(w && w.x === HUT_DOOR[0] && w.y === HUT_DOOR[1]);
  }
  function offerStep() { showEvent(TX.hut, TX.hutBody, [{ t: TX.leaveCoat, f: leaveCoat }, { t: TX.leave, f: null }]); }
  function leaveCoat() {
    const f = F(); if (stage() !== 1) return;
    G.take(COAT); f.p46_coat = 2;
    try { journal('side', TX.jLeft); } catch (e) { /* none */ }
    syncStep(G.map);
    showEvent(TX.hut, TX.leftCoat, [{ t: TX.leave, f: null }]);
  }
  function syncStep(m) {
    if (!m || m.id !== CLEARING || !Array.isArray(m.entities)) return;
    const want = stage() >= 2 && !gone();
    const i = m.entities.findIndex((o) => o && o._p46 === 'step');
    if (want && i < 0) m.entities.push({ kind: 'deco', sprite: 'p46_parcel', x: STEP.x, y: STEP.y, solid: false, radius: 0.2, scale: 0.55, label: TX.parcel, use: 'p46_look', look: TX.parcelLook, transient: true, _decor: true, _p46: 'step' });
    if (!want && i >= 0) m.entities.splice(i, 1);
  }
  // Aldric: the ask, and hearing how it went. His own quest function is null; it is put back after each talk.
  const aldricReady = (f) => !gone() && here() === 'greenhall' && ((f.p46_room && !f.p46_ask) || (stage() === 2 && !f.p46_told));
  function aldricTalk(g) {
    const f = g.flags; if (!aldricReady(f)) return null;
    if (!f.p46_ask) { f.p46_ask = true; return { text: TX.aldricAsk, journal: ['side', TX.jAsk] }; }
    return { text: TX.aldricWell, choices: [
      { t: TX.toldStep, f: () => { f.p46_coat = 3; f.p46_told = true; try { questXp(40); journal('side', TX.jDone); } catch (e) { /* none */ } return TX.toldNo; } },
      { t: TX.notYet, f: () => TX.notYetReply },
    ] };
  }
  function closeAtLeaving() {
    if (!gone()) return;
    const f = F(); if (!f.p46_ask || f.p46_told || f.p46_closed) return;
    f.p46_closed = true;
    const s = stage();
    try { journal('side', s === 1 ? TX.jClosedCarry : s === 2 ? TX.jClosedLeft : TX.jClosedNone); } catch (e) { /* none */ }
  }

  // ================================================================ uses
  function useOwn(e) {
    if (!e || typeof e.use !== 'string' || e.use.indexOf('p46_') !== 0) return false;
    if (e.use === 'p46_look') { showEvent(e.label || '', e.look || '', [{ t: TX.leave, f: null }]); return true; }
    if (e.use === 'p46_coat') { useCoat(e); return true; }
    if (e.use === 'p46_dressing') { useDressing(); return true; }
    return false;
  }

  // ================================================================ the tick and the wiring
  function tick() {
    if (!hasG() || G.state !== 'play' || guest()) return;
    try { closeAtLeaving(); } catch (e) { warnOnce('close', e); }
  }
  function onLoad() {
    if (!hasG()) return;
    try {
      if (G.maps) syncOak(G.maps[OAK]);
      syncStep(G.maps && G.maps[CLEARING]);
      syncPeg(G.maps && G.maps[MAPS.room]);
      const f = G.flags;
      if (here() === MAPS.room && !f.p46_room) { f.p46_room = true; say(TX.roomSeen, 'warn', 6000); }
      if (here() === MAPS.house) f.p46_house = true;
    } catch (e) { warnOnce('load', e); }
  }
  function wire() {
    paint();
    if (typeof NPCS !== 'undefined') for (const k in P) if (!NPCS[k]) NPCS[k] = P[k];
    if (typeof ITEMS !== 'undefined') for (const k in ITEM_DEFS) if (!ITEMS[k]) ITEMS[k] = Object.assign({}, ITEM_DEFS[k]);
    try { if (typeof VOICES !== 'undefined' && VOICES.PEOPLE) Object.assign(VOICES.PEOPLE, Object.assign({ p46_marrit: { f0: 200, fs: 1.02, style: 'plain' } }, VOICES.PEOPLE)); } catch (e) { /* default voices */ }
    if (typeof buildAllMaps === 'function') {
      const _b = buildAllMaps;
      buildAllMaps = function () { const maps = _b.apply(this, arguments); try { buildMaps(maps); } catch (e) { warnOnce('build', e); } return maps; };
    }
    if (typeof useDeco === 'function') {
      const _ud = useDeco;
      useDeco = function (e) { try { if (useOwn(e)) return undefined; } catch (err) { warnOnce('use', err); } return _ud.apply(this, arguments); };
    }
    if (typeof interact === 'function') {
      const _i = interact;
      interact = function () {
        try { if (G.state === 'play' && !guest() && atHutDoor()) { let e = null; try { e = Engine.pick(G.ents, USE_RANGE); } catch (err) { e = null; } if (!e || e.dead) { offerStep(); return undefined; } } } catch (err) { warnOnce('hut', err); }
        return _i.apply(this, arguments);
      };
    }
    if (typeof talk === 'function') {
      const _t = talk;
      talk = function (e) {
        const n = e && e.id === 'aldric' && typeof NPCS !== 'undefined' ? NPCS.aldric : null;
        if (!n || !hasG() || guest() || !aldricReady(G.flags)) return _t.apply(this, arguments);
        const own = n.quest;
        n.quest = function (g) { try { return aldricTalk(g) || (own ? own.apply(this, arguments) : null); } catch (err) { warnOnce('aldric', err); return own ? own.apply(this, arguments) : null; } };
        try { return _t.apply(this, arguments); } finally { n.quest = own; }
      };
    }
    if (typeof updateNarrow === 'function') {
      const _un = updateNarrow;
      updateNarrow = function () { const r = _un.apply(this, arguments); tick(); return r; };
    }
    for (const fn of ['loadMap', 'restoreGame']) {
      if (typeof window[fn] !== 'function') continue;
      const _f = window[fn];
      window[fn] = function () { const r = _f.apply(this, arguments); onLoad(); return r; };
    }
  }
  try { wire(); } catch (e) { console.warn('governor46 failed to wire', e); }

  return {
    TX, P, MAPS, OAK_DOOR, HUT_DOOR, COAT, TEXTS,
    useOwn, stage, aldricTalk, aldricReady, closeAtLeaving, syncOak, syncStep, atHutDoor, leaveCoat, takeCoat,
  };
})();
if (typeof window !== 'undefined') window.GOVERNOR46 = GOVERNOR46;
