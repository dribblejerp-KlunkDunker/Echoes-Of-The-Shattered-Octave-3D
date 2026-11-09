// ============================================================
//  grove31 — Release road R5b: the Moot-house's gallery and cellar, and the Bell Yard and Ashlane, in Whisper-Grove.
//
//    * THE MOOT-HOUSE (Book One ch. 14): the plaza's fourth side. Libraries26 built its hall as a library; this adds a stair
//      up to the GALLERY, where Sable first saw a proctor ("a grey figure in oilcloth at the edge of the mist ... watching
//      the plaza for a full hour"), and the room she made for herself in the MUNIMENT STORE: lamp, desk, ruler, nib and
//      blotter. And a stair down to the CELLAR, where Corwin Aye's barrel "has not leaked in nineteen years" (ch. 16).
//    * THE BELL YARD AND ASHLANE (one map, off the Sunken Court's west side): the joiners' and coopers' streets.
//      Shutters latched, streets swept, a window-box of dead flowers on Bell Yard (ch. 15), the lamps the lamplighter lights
//      with no oil in them, carts in the carters' yard with their shafts up, and the Office's proctors walking it (ch. 14).
//      Halder Wick's house (joiner, of the Bell Yard) and Ivo Renn's (cooper, of Ashlane) open: meals left on the tables.
//    * "THE BELL YARD ROLL" [PROPOSED: the quest; the names are canon or from the library's books]: the name-boards on
//      the doors. Write each household into your ledger.
//    * "DO NOT COMFORT YOURSELF IN THE MARGIN" (ch. 14): the twice-taken man sits against a wall in Ashlane doing nothing
//      at all. Tell Sable you found him, and she gives you her margin entry and the Veil's three rules.
//
//  Bettis Renn is Ivo's wife, as in Book One (38, "she asked to go second"); she is the woman Sable puts back in the Malting.
//  The new maps are always built (a save may stand in one); nothing draws on the random stream. Both quests close with a
//  logbook line when the Kestrel leaves Whisper-Grove (Part Four).
// ============================================================
'use strict';

const GROVE31 = (function () {
  const TEXTS = [];
  const S = (t) => { TEXTS.push(t); return t; };
  const hasG = () => typeof G !== 'undefined' && G && G.map && G.player;
  const F = () => (hasG() && G.flags) || {};
  const gone = () => { const f = F(); return !!f.part4; };
  const here = () => (hasG() ? G.mapId : null);
  const say = (t, cls, ms) => { try { msg(t, cls || '', ms || 4500); } catch (e) { /* cosmetic */ } };
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; console.warn('grove31: ' + k + ' failed', e); } };
  const guest = () => { try { return typeof SYNC19 !== 'undefined' && !!SYNC19.isGuest(); } catch (e) { return false; } };
  const PI = Math.PI;

  const MAPS = { gallery: 'p31_gallery', cellar: 'p31_cellar', yard: 'p31_bellyard', wick: 'p31_wick', renn: 'p31_renn' };
  const MOOT = 'lib_moot', GROVE = 'whispergrove';
  const MOOT_DOORS = { gallery: [14, 8], cellar: [0, 8] };   // the Moot-house hall's east and west walls (15 x 11)
  const GROVE_GATE = [0, 29];                                  // the Sunken Court's west side, between two drowned houses

  const TX = {
    leave: S('Leave it.'),
    gallery: S('The Moot-house gallery'),
    cellar: S('The Moot-house cellar'),
    yard: S('The Bell Yard and Ashlane'),
    wick: S('Halder Wick\'s house'),
    renn: S('Ivo Renn\'s house'),
    // doors
    toGallery: S('The stair up to the gallery'),
    toCellar: S('The cellar stair'),
    toHall: S('Down to the hall'),
    upHall: S('Up to the hall'),
    toYard: S('An archway: the Bell Yard'),
    toCourt: S('Back to the Sunken Court'),
    toLane: S('Out to the street'),
    shut: S('The door is latched. Inside, nothing moves, and the dust on the step has no footprints in it but a cat\'s.'),
    // the gallery and the muniment store
    window: S('A gallery window over the plaza'),
    windowLook: S('From up here you can see the whole of it: the drowned court, the lit water, the Hollows walking their loops through the mist. On a Stasisday Sable stood at this window and watched a grey figure in oilcloth at the edge of the mist, standing still the way only Catalogue field staff stand still, for a full hour without once shifting his weight.'),
    desk: S('Sable\'s desk, in the muniment store'),
    deskLook: S('A clerk\'s desk pulled in among the deed-chests: a ruler, a nib, a blotter, a lamp. On the blotter, in a very straight hand, a sum: 74,611 at twenty a night is ten years and two hundred and twenty days. Under it, smaller: and then begin again.'),
    deskGone: S('A clerk\'s desk among the deed-chests, cleared. The ruler and the nib are gone with her; the blotter stays, with a sum pressed into it backwards that you can still read: ten years and two hundred and twenty days.'),
    sheet: S('A practice sheet'),
    sheetLook: S('One word, written down the page in the same straight hand, over and over, as if to keep it: scriptorium. scriptorium. scriptorium. Near the bottom the letters begin to arrive a little late.'),
    chests: S('Deed-chests, the town\'s records'),
    chestsLook: S('The Moot\'s deed-chests: leases, banns, the minutes of three hundred years of the town deciding things. The Office went through them and took nothing. It already had the names.'),
    benchUp: S('A gallery bench'),
    // the cellar
    barrels: S('Barrels, the Moot\'s stores'),
    barrel: S('A barrel with a mark burned into the head'),
    barrelLook: S('An oak barrel, iron-hooped, with a cooper\'s mark burned into its head: a ring with a notch, and the letters C. AYE. It has stood in this cellar nineteen years and it has not leaked. Corwin Aye, cooper of the Ashlane, carried in the second consignment, sixteen crates. He was in a ship\'s hold for eleven days.'),
    // the Bell Yard and Ashlane
    flowers: S('A window-box of dead flowers'),
    flowersLook: S('A window-box on Bell Yard, full of dead flowers: three years of them, one summer\'s crop fallen and the next grown up through the rot and fallen in its turn. Nobody has thrown them out. Nobody has been told to.'),
    lamp: S('A dry lamp. The lamplighter lights it every night with a taper, waits, and moves on. There has been no oil in it since 416.'),
    carts: S('A cart with its shafts up'),
    cartsLook: S('Carts in the carters\' yard with their shafts up, the way you leave them overnight. The horses are long gone. Animals did not take the Forgetting; they simply left when nobody fed them.'),
    swept: S('The street is swept. The shutters are latched. Nothing has fallen down. That is the first wrong thing about it.'),
    entered: S('The Bell Yard. The streets are swept and the shutters latched, and a lamplighter\'s pole leans in a doorway. The Office has proctors here; you heard them say so.'),
    board: S('A name-board by the door'),
    write: S('Write the name in your ledger.'),
    written: S('Written. The board stays on the door, and now the name is somewhere else too.'),
    already: S('The name is in your ledger already.'),
    // the houses
    table4: S('A table laid for four'),
    table4Look: S('A table laid for four, under three years of dust: four plates, four cups, a loaf gone to grey stone in the middle. One of the plates is missing from its place. You know where it is; it is blue, and he carries it to the plaza every evening.'),
    bench: S('A joiner\'s bench'),
    benchLook: S('A joiner\'s bench with a half-made chair-back still in the vice, the glue dried in its pot. He was taken in the first hour of the second day, because the works began at the end of his own street.'),
    hearthCold: S('A cold hearth'),
    pot: S('A pot on the hook, gone to dust. Whatever it was, it was meant for when they came in.'),
    bowls: S('Two bowls on the table'),
    bowlsLook: S('Two bowls and two spoons, set out for supper and never used, and a crock of salt between them. Ivo and Bettis Renn were taken within the hour of each other, on the fourth day. He asked whether he would be permitted to keep his hands. He was told that he would. She asked to go second.'),
    staves: S('A cooper\'s staves and hoops'),
    stavesLook: S('Oak staves in a rack, shaved and bent, waiting to be raised into a barrel; an adze, a croze, a sun-plane, and a leather apron on a nail with I.R. burned into the strap.'),
    // the twice-taken man and Sable
    twiceFound: S('A man sits against the wall with his legs straight out in front of him, and he is not doing anything. That is how you know. Every Hollow does something: walks a loop, washes a plate, sets a table. His eyes are open and wet and they follow you when you crouch in front of him, and there is nothing behind them, and there will never be anything behind them again. The Office has pressed him a second time.'),
    twiceAgain: S('He has not moved. His eyes follow you. There is nothing behind them.'),
    sableRules: S('She opens the Ledger to his entry without looking for it. In the margin a line has been struck through: This was done because I spoke to him. Under it, properly: He was pressed a second time by the Office of the Catalogue on the fourteenth or fifteenth day of Leaffall, 419, in the course of an inquiry into the theft of this book. "The Veil keeps three rules," she says. "Write what happened. Write who it happened to. Do not comfort yourself in the margin." She closes the book. "The third is the hardest. I keep it anyway."'),
    // the logbook
    jRoll: S('The doors of the Bell Yard and Ashlane still carry their name-boards. Joiners, coopers, a wheelwright, a midwife, the lamp-warden. I can write each household into my ledger.'),
    jRollDone: S('The Bell Yard Roll: I wrote every household on the Bell Yard and in Ashlane into my ledger, from the boards on their doors.'),
    jRollClosed: S('The Kestrel has left Whisper-Grove. Some of the Bell Yard\'s name-boards are not in my ledger, and nobody else is going to read them.'),
    jTwice: S('In Ashlane a Hollow sits against a wall doing nothing at all. The Office pressed him a second time. Sable should know he has been found.'),
    jTwiceDone: S('Do Not Comfort Yourself in the Margin: I told Sable about the twice-taken man in Ashlane. She showed me his entry, and the margin note she struck through, and told me the Veil\'s three rules.'),
    jTwiceClosed: S('The Kestrel has left Whisper-Grove. I never told Sable about the man in Ashlane who does nothing at all.'),
    rollAll: S('Every name on the Bell Yard and in Ashlane is in your ledger now.'),
  };

  // the households: [board key, name, trade line (shown on the board), where]
  const NAMES = [
    ['wick', 'Halder Wick', S('WICK. JOINER. Chairs mended, coffins to order.'), S('the Bell Yard')],
    ['salk', 'Mirren Salk', S('SALK. WHEELWRIGHT. Under the name, newer paint: widow, and the work still taken.'), S('the Bell Yard')],
    ['lowry', 'Osmer Lowry', S('LOWRY. WARDEN OF THE LAMPS. Ring at any hour.'), S('the Bell Yard')],
    ['amory', 'Edith Amory', S('AMORY. A slate under it, in a girl\'s hand: Rosamund is at the basin.'), S('the Bell Yard')],
    ['renn', 'Ivo Renn', S('RENN. COOPER. Barrels, tubs and casks; staves dressed while you wait.'), S('Ashlane')],
    ['aye', 'Corwin Aye', S('AYE. COOPER. A ring with a notch burned into the board, the same mark he burned into every barrel-head.'), S('Ashlane')],
    ['imrie', 'Grisel Imrie', S('IMRIE. MIDWIFE. Knock twice and wait; if I am out, I am at a birth.'), S('Ashlane')],
  ];

  // ---- people (Hollows that keep a task; the twice-taken man keeps none)
  const P = {
    p31_twice: { name: S('A man against the wall'), sprite: 'p31_seated', portrait: 'townsman', tier: 'low', topics: {}, quest: null,
      greet: { polite: TX.twiceAgain, normal: TX.twiceAgain, blunt: TX.twiceAgain } },
    p31_sweeper: { name: S('A Hollow with a broom'), sprite: 'hollow', portrait: 'townsman', tier: 'low', topics: {}, quest: () => null,
      greet: { polite: S('...the step, then the next step... she likes the step done...'), normal: S('...the step, then the next step... she likes the step done...'), blunt: S('...the step, then the next step... she likes the step done...') } },
    p31_jugs: { name: S('A Hollow at a window'), sprite: 'hollow', portrait: 'townswoman', tier: 'low', topics: {}, quest: () => null,
      greet: { polite: S('...the blue one, and the white one... the blue one, and the white one...'), normal: S('...the blue one, and the white one... the blue one, and the white one...'), blunt: S('...the blue one, and the white one... the blue one, and the white one...') } },
    p31_shutters: { name: S('A Hollow at the shutters'), sprite: 'hollow', portrait: 'townsman', tier: 'low', topics: {}, quest: () => null,
      greet: { polite: S('...latched... latched... you can never be too sure...'), normal: S('...latched... latched... you can never be too sure...'), blunt: S('...latched... latched... you can never be too sure...') } },
  };
  P.p31_twice.quest = (g) => {
    const f = g.flags;
    if (!f.p31_twice) { f.p31_twice = true; return { text: TX.twiceFound, journal: ['side', TX.jTwice] }; }
    return { text: TX.twiceAgain };
  };

  // ================================================================ sprites (procedural stand-ins)
  function paint() {
    if (typeof Engine === 'undefined' || !Engine.addSprite) return;
    const mk = (name, draw) => {
      if (Engine.sprites && Engine.sprites[name]) return;
      const w = 24, h = 24, d = new Uint32Array(w * h);
      const px = (x, y, r, g, b) => { if (x >= 0 && y >= 0 && x < w && y < h) d[y * w + x] = (255 << 24) | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0); };
      draw(px); Engine.addSprite(name, { w, h, data: d, hs: 1, cx: 0.5, dy: 0 });
    };
    mk('p31_window', (px) => {   // a tall gallery window, lilac mist in the panes
      for (let y = 2; y < 22; y++) for (let x = 6; x < 18; x++) {
        const frame = x === 6 || x === 17 || y === 2 || y === 21 || x === 11 || x === 12 || y === 11;
        if (frame) px(x, y, 150, 146, 156); else { const k = (y - 2) / 20; px(x, y, 120 + k * 40, 104 + k * 30, 156 + k * 30); }
      }
    });
    mk('p31_flowers', (px) => {   // a window-box of dead flowers
      for (let x = 4; x < 20; x++) for (let y = 15; y < 19; y++) px(x, y, y === 15 ? 96 : 76, y === 15 ? 70 : 54, y === 15 ? 44 : 34);
      for (let i = 0; i < 9; i++) { const x = 5 + i * 1.7 | 0, top = 7 + ((i * 5) % 6); for (let y = top; y < 15; y++) px(x, y, 104, 96, 66); px(x - 1, top, 120, 90, 70); px(x + 1, top + 1, 98, 76, 58); }
    });
    mk('p31_seated', (px) => {   // a man sitting against a wall, legs straight out toward you, hands open on the stones
      const coat = [74, 72, 66], dark = [52, 50, 46], skin = [176, 162, 146], hair = [70, 62, 54];
      for (let y = 5; y < 10; y++) for (let x = 9; x < 15; x++) px(x, y, ...skin);           // head, tipped back to the wall
      for (let x = 9; x < 15; x++) px(x, 4, ...hair); px(9, 5, ...hair); px(14, 5, ...hair);
      px(10, 7, 40, 36, 34); px(13, 7, 40, 36, 34);                                         // the open eyes
      px(11, 9, 120, 96, 90); px(12, 9, 120, 96, 90);                                       // the mouth, slack
      for (let y = 10; y < 17; y++) for (let x = 8; x < 16; x++) px(x, y, ...(x === 8 || x === 15 ? dark : coat));   // the trunk
      for (let y = 12; y < 17; y++) { px(6, y, ...coat); px(17, y, ...coat); }                // the arms, hanging
      px(6, 17, ...skin); px(17, 17, ...skin); px(5, 17, ...skin); px(18, 17, ...skin);       // the hands on the stones
      for (let y = 17; y < 23; y++) for (let x = 8; x < 16; x++) px(x, y, ...((x === 11 || x === 12) ? dark : [86, 80, 70]));   // the legs, straight out
      for (const x of [8, 9, 10, 13, 14, 15]) px(x, 23, 40, 34, 28);                        // the boots
    });
    mk('p31_coldhearth', (px) => {   // a stone hearth, cold: grey ash, a black throat, no flame
      for (let y = 6; y < 23; y++) for (let x = 3; x < 21; x++) { const edge = x < 6 || x > 17 || y < 9; const n = ((x * 7 + y * 3) % 5) * 4; if (edge) px(x, y, 112 + n, 108 + n, 102 + n); }
      for (let y = 9; y < 23; y++) for (let x = 6; x < 18; x++) px(x, y, 22, 20, 20);
      for (let x = 6; x < 18; x++) for (let y = 20; y < 23; y++) px(x, y, 128 - (y - 20) * 10, 124 - (y - 20) * 10, 120 - (y - 20) * 10);
      for (let x = 9; x < 15; x++) px(x, 19, 70, 58, 46);
    });
    mk('p31_desk', (px) => {   // a clerk's sloped desk with a lamp and a ruled page
      for (let x = 3; x < 21; x++) for (let y = 12; y < 15; y++) px(x, y, 104, 74, 46);
      for (const x of [4, 19]) for (let y = 15; y < 23; y++) px(x, y, 84, 58, 36);
      for (let x = 6; x < 13; x++) for (let y = 9; y < 12; y++) px(x, y, 226, 218, 196);
      for (let x = 7; x < 12; x++) px(x, 10, 120, 116, 120);
      for (let y = 6; y < 12; y++) px(16, y, 120, 110, 90); for (let x = 14; x < 19; x++) for (let y = 3; y < 6; y++) px(x, y, 250, 210, 120);
    });
  }

  // ================================================================ the maps (new maps: always built)
  const look = (m, sprite, x, y, label, text, o) => m.deco(sprite, x, y, Object.assign({ radius: 0.3, scale: 0.7, label, use: 'p31_look', look: text }, o || {}));
  const room = (id, name, w, h, wall, o) => {
    const m = new GameMap(id, name, w, h, Object.assign({ floor: 't_wood', ceil: 't_wood', fogDist: 16, ambient: 0.26, fogColor: [0, 0, 0], music: 'inside' }, o || {}));
    m.border(wall); return m;
  };
  function buildGallery() {
    const m = room(MAPS.gallery, TX.gallery, 14, 6, 't_greymarble', { floor: 't_flag', ceil: 't_greymarble', ambient: 0.24, spawn: { x: 1.6, y: 3.5, dir: 0 } });
    m.set(0, 3, DOOR({ portal: { map: MOOT, x: 13.4, y: 8.5, dir: PI }, label: TX.toHall }));
    for (const x of [3.5, 6.5, 9.5]) look(m, 'p31_window', x, 4.62, TX.window, TX.windowLook, { solid: false, scale: 1.1, radius: 0.1 });
    m.deco('bench', 5.0, 3.6, { radius: 0.35, scale: 0.7, label: TX.benchUp });
    // the muniment store at the east end
    m.rect(10, 1, 10, 2, 't_greymarble');
    m.deco('p31_desk', 12.0, 1.6, { radius: 0.45, scale: 0.85, use: 'p31_desk', label: TX.desk });
    m.deco('lamp', 12.8, 2.9, { radius: 0.12, scale: 0.55, glow: 0.45, solid: false });
    look(m, 'sign', 11.2, 1.3, TX.sheet, TX.sheetLook, { solid: false, scale: 0.45, radius: 0.15 });
    look(m, 'chest', 12.6, 4.4, TX.chests, TX.chestsLook, { scale: 0.65, radius: 0.35 });
    look(m, 'crates', 11.2, 4.5, TX.chests, TX.chestsLook, { scale: 0.6, radius: 0.35 });
    m.baseCount = m.entities.length;
    return m;
  }
  function buildCellar() {
    const m = room(MAPS.cellar, TX.cellar, 10, 7, 't_stone', { floor: 't_flag', ceil: 't_stone', ambient: 0.2, fogColor: [8, 8, 12], spawn: { x: 8.4, y: 3.5, dir: PI } });
    m.set(9, 3, DOOR({ portal: { map: MOOT, x: 1.6, y: 8.5, dir: 0 }, label: TX.upHall }));
    for (const [x, y] of [[1.5, 1.5], [2.5, 1.4], [1.4, 2.6], [1.5, 5.4], [2.6, 5.5], [4.5, 5.5]]) m.deco('p_barrel', x, y, { radius: 0.3, scale: 0.62, label: TX.barrels });
    m.deco('p_barrel', 4.6, 1.5, { radius: 0.32, scale: 0.7, label: TX.barrel, use: 'p31_barrel' });
    m.deco('lamp', 7.5, 1.5, { radius: 0.12, scale: 0.55, glow: 0.5, solid: false });
    m.deco('shelf', 6.5, 5.6, { radius: 0.25, scale: 0.8, label: TX.barrels });
    m.item('tonic', 6.4, 1.6);
    m.baseCount = m.entities.length;
    return m;
  }
  // the Bell Yard and Ashlane: the Bell Yard along the north, Ashlane along the south, the carters' yard on the water
  const YW = 34, YH = 22;
  const YARD_DOORS = {   // [x, y, board key or null, portal map or null]
    wick: [4, 3, 'wick', MAPS.wick], salk: [10, 3, 'salk', null], lowry: [16, 3, 'lowry', null], amory: [22, 3, 'amory', null],
    renn: [5, 13, 'renn', MAPS.renn], aye: [12, 13, 'aye', null], imrie: [19, 13, 'imrie', null],
    n1: [26, 3, null, null], s1: [8, 17, null, null], s2: [17, 17, null, null], s3: [23, 17, null, null], m1: [8, 8, null, null], m2: [20, 8, null, null],
  };
  function buildYard() {
    const m = new GameMap(MAPS.yard, TX.yard, YW, YH, {
      outdoor: true, floor: 't_shallows', floorTextures: ['t_shallows', 't_marble', 't_water', 't_flag'], fogDist: 18, fogColor: [104, 88, 128], ambient: 0.17,
      music: 'grove', danger: 1, spawn: { x: YW - 1.8, y: 11.5, dir: PI },
    });
    m.border('t_greymarble');
    const lay = (x0, y0, x1, y1, idx) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) m.setFloor(x, y, idx); };
    lay(1, 4, 30, 7, 1);      // the Bell Yard, paved
    lay(1, 14, 26, 16, 3);    // Ashlane, flagged
    lay(31, 9, 32, 13, 1);    // the archway's apron
    for (const [x, y] of [[29, 18], [30, 18], [29, 19]]) m.setFloor(x, y, 2);   // where the yard's drain went down
    const house = (x0, y0, x1, y1) => {
      m.rect(x0, y0, x1, y1, 't_greymarble');
      for (let y = y0 + 1; y < y1; y++) for (let x = x0 + 1; x < x1; x++) m.block(x, y, 't_greymarble', 1.55, { capTex: 't_roof' });
    };
    house(1, 1, 29, 3); house(1, 8, 26, 13); house(1, 17, 26, 20);
    m.set(YW - 1, 11, DOOR({ portal: { map: GROVE, x: GROVE_GATE[0] + 1.6, y: GROVE_GATE[1] + 0.5, dir: 0 }, label: TX.toCourt }));
    for (const k in YARD_DOORS) {
      const [x, y, key, portal] = YARD_DOORS[k];
      if (portal) m.set(x, y, DOOR({ portal: { map: portal, x: 3.5, y: 5.0, dir: -PI / 2 }, label: key === 'wick' ? TX.wick : TX.renn }));
      else m.set(x, y, DOOR({ locked: '__never', lockMsg: TX.shut, label: TX.board }));
      if (key) m.deco('sign', x + 1.15, y === 3 ? 4.1 : 13.9, { solid: false, scale: 0.55, radius: 0.15, label: TX.board, use: 'p31_board', board: key });
    }
    // the Bell Yard: dry lamps, the window-box, the sweeper, the woman at the window
    for (const x of [6.5, 12.5, 18.5, 24.5, 29.5]) m.deco('lamp', x, 7.5, { radius: 0.12, scale: 0.85, glow: 0, drylamp: true, label: TX.lamp });
    look(m, 'p31_flowers', 11.6, 4.08, TX.flowers, TX.flowersLook, { solid: false, scale: 0.9, radius: 0.1 });
    m.npc('p31_sweeper', 15.2, 4.6, { facing: PI / 2 });
    m.npc('p31_jugs', 23.4, 4.5, { facing: -PI / 2 });
    m.npc('p31_shutters', 9.3, 7.4, { facing: -PI / 2 });
    look(m, 'sign', 2.5, 6.6, TX.board, TX.swept, { solid: false, scale: 0.01, radius: 0.4 });
    // Ashlane: the twice-taken man against the wall, and Corwin Aye's barrels outside his door
    m.npc('p31_twice', 15.5, 14.4, { facing: PI / 2, scale: 0.75 });
    for (const [x, y] of [[10.9, 14.4], [11.5, 14.3]]) m.deco('p_barrel', x, y, { radius: 0.25, scale: 0.55, label: TX.barrel, use: 'p31_barrel' });
    for (const x of [9.5, 21.5]) m.deco('lamp', x, 16.5, { radius: 0.12, scale: 0.8, glow: 0, drylamp: true, label: TX.lamp });
    // the carters' yard on the water: carts with their shafts up
    look(m, 'p_cart', 30.0, 16.2, TX.carts, TX.cartsLook, { scale: 0.9, radius: 0.5 });
    look(m, 'p_cart', 31.4, 19.0, TX.carts, TX.cartsLook, { scale: 0.9, radius: 0.5 });
    m.deco('willow', 28.6, 9.6, { scale: 1.7, radius: 0.4 });
    // the Office walking it
    m.enemy('proctor', 9.5, 5.6); m.enemy('proctor', 22.5, 15.2);
    m.item('bolts', 27.5, 19.6);
    m.baseCount = m.entities.length;
    return m;
  }
  function buildWick() {
    const m = room(MAPS.wick, TX.wick, 8, 7, 't_greymarble', { spawn: { x: 3.5, y: 5.0, dir: -PI / 2 } });
    m.set(3, 6, DOOR({ portal: { map: MAPS.yard, x: YARD_DOORS.wick[0] + 0.5, y: 4.6, dir: PI / 2 }, label: TX.toLane }));
    look(m, 'table', 3.5, 2.6, TX.table4, TX.table4Look, { scale: 0.75, radius: 0.5 });
    for (const [x, y] of [[2.5, 2.0], [4.5, 2.0], [2.5, 3.3], [4.5, 3.3]]) m.deco('chair', x, y, { radius: 0.2, scale: 0.5 });
    look(m, 'table', 6.0, 4.6, TX.bench, TX.benchLook, { scale: 0.7, radius: 0.45 });
    look(m, 'p31_coldhearth', 1.4, 1.4, TX.hearthCold, TX.pot, { scale: 0.85, radius: 0.4 });
    m.item('bandage', 6.2, 1.5);
    m.baseCount = m.entities.length;
    return m;
  }
  function buildRenn() {
    const m = room(MAPS.renn, TX.renn, 8, 7, 't_greymarble', { spawn: { x: 3.5, y: 5.0, dir: -PI / 2 } });
    m.set(3, 6, DOOR({ portal: { map: MAPS.yard, x: YARD_DOORS.renn[0] + 0.5, y: 14.5, dir: PI / 2 }, label: TX.toLane }));
    look(m, 'table', 3.0, 2.4, TX.bowls, TX.bowlsLook, { scale: 0.7, radius: 0.5 });
    look(m, 'shelf', 6.4, 1.5, TX.staves, TX.stavesLook, { scale: 0.85, radius: 0.25 });
    m.deco('p_barrel', 6.2, 4.4, { radius: 0.3, scale: 0.65, label: TX.staves });
    look(m, 'p31_coldhearth', 1.4, 4.6, TX.hearthCold, TX.pot, { scale: 0.85, radius: 0.4 });
    m.baseCount = m.entities.length;
    return m;
  }
  function buildMaps(maps) {
    if (!maps[MAPS.gallery]) maps[MAPS.gallery] = buildGallery();
    if (!maps[MAPS.cellar]) maps[MAPS.cellar] = buildCellar();
    if (!maps[MAPS.yard]) maps[MAPS.yard] = buildYard();
    if (!maps[MAPS.wick]) maps[MAPS.wick] = buildWick();
    if (!maps[MAPS.renn]) maps[MAPS.renn] = buildRenn();
    const moot = maps[MOOT];
    if (moot && moot.w === 15 && moot.h === 11) {
      moot.set(MOOT_DOORS.gallery[0], MOOT_DOORS.gallery[1], DOOR({ portal: { map: MAPS.gallery, x: 1.6, y: 3.5, dir: 0 }, label: TX.toGallery }));
      moot.set(MOOT_DOORS.cellar[0], MOOT_DOORS.cellar[1], DOOR({ portal: { map: MAPS.cellar, x: 8.4, y: 3.5, dir: PI }, label: TX.toCellar }));
    }
    const wg = maps[GROVE];
    if (wg && wg.w === 48 && wg.h === 48) wg.set(GROVE_GATE[0], GROVE_GATE[1], DOOR({ portal: { map: MAPS.yard, x: YW - 1.8, y: 11.5, dir: PI }, label: TX.toYard }));
  }

  // ================================================================ the quests
  const inLedger = (name) => hasG() && Array.isArray(G.ledger) && G.ledger.some((r) => r && String(r.name).indexOf(name) === 0);
  const rollCount = () => { const f = F(); return NAMES.filter(([k]) => f['p31_n_' + k]).length; };
  function writeName(key) {
    const f = F(), row = NAMES.find((r) => r[0] === key); if (!row) return;
    if (!f.p31_roll) { f.p31_roll = 1; journal('side', TX.jRoll); }
    if (f['p31_n_' + key]) { say(TX.already, '', 3000); return; }
    f['p31_n_' + key] = true;
    if (!inLedger(row[1])) G.ledger.push({ name: row[1], where: row[3], day: G.day });
    say(TX.written, 'good', 3500);
    if (rollCount() >= NAMES.length && f.p31_roll !== 2) {
      f.p31_roll = 2; try { questXp(40); } catch (e) { /* no xp */ }
      say(TX.rollAll, 'good', 5000); journal('side', TX.jRollDone);
    }
  }
  function useBoard(e) {
    const row = NAMES.find((r) => r[0] === e.board); if (!row) return;
    const f = F(), done = !!f['p31_n_' + row[0]];
    showEvent(TX.board, row[2], done ? [{ t: TX.leave, f: null }] : [{ t: TX.write, f: () => writeName(row[0]) }, { t: TX.leave, f: null }]);
  }
  function useBarrel() {
    const f = F(), done = !!f.p31_n_aye;
    showEvent(TX.barrel, TX.barrelLook, done ? [{ t: TX.leave, f: null }] : [{ t: TX.write, f: () => writeName('aye') }, { t: TX.leave, f: null }]);
  }
  function useDesk() { const f = F(); showEvent(TX.desk, f.sable_joined ? TX.deskGone : TX.deskLook, [{ t: TX.leave, f: null }]); }
  // Sable hears about the twice-taken man once, through her own dialogue (her quest function itself is left as it was)
  const sableReady = (f) => f.p31_twice && !f.p31_rules && !gone() && !(f.wg_ambush && !f.wg_ambush_over);
  function sableRules(g) {
    const f = g.flags; if (!sableReady(f)) return null;
    f.p31_rules = true;
    try { questXp(30); } catch (e) { /* no xp */ }
    return { text: TX.sableRules, journal: ['side', TX.jTwiceDone] };
  }
  function closeAtLeaving() {
    if (!gone()) return;
    const f = F();
    if (f.p31_roll === 1 && !f.p31_roll_closed) { f.p31_roll_closed = true; journal('side', TX.jRollClosed); }
    if (f.p31_twice && !f.p31_rules && !f.p31_twice_closed) { f.p31_twice_closed = true; journal('side', TX.jTwiceClosed); }
  }

  // ================================================================ uses
  function useOwn(e) {
    if (!e || typeof e.use !== 'string' || e.use.indexOf('p31_') !== 0) return false;
    if (e.use === 'p31_look') { showEvent(e.label || '', e.look || '', [{ t: TX.leave, f: null }]); return true; }
    if (e.use === 'p31_board') { useBoard(e); return true; }
    if (e.use === 'p31_barrel') { useBarrel(); return true; }
    if (e.use === 'p31_desk') { useDesk(); return true; }
    return false;
  }

  // ================================================================ the tick and the wiring
  const said = {};
  function tick() {
    if (!hasG() || G.state !== 'play' || guest()) return;
    try { closeAtLeaving(); } catch (e) { warnOnce('close', e); }
  }
  function onLoad() {
    if (!hasG()) return;
    try { if (here() === MAPS.yard && !said[G.day]) { said[G.day] = true; say(TX.entered, 'warn', 6500); } } catch (e) { warnOnce('load', e); }
  }
  function wire() {
    paint();
    if (typeof NPCS !== 'undefined') for (const k in P) if (!NPCS[k]) NPCS[k] = P[k];
    // their voices (js/voices.js): Hollows breathe their lines; the twice-taken man has none left, but the table needs a row
    try {
      if (typeof VOICES !== 'undefined' && VOICES.PEOPLE) Object.assign(VOICES.PEOPLE, Object.assign({
        p31_twice: { f0: 120, fs: 0.96, style: 'breathy' }, p31_sweeper: { f0: 176, fs: 1.04, style: 'breathy' },
        p31_jugs: { f0: 190, fs: 1.06, style: 'breathy' }, p31_shutters: { f0: 132, fs: 0.98, style: 'breathy' },
      }, VOICES.PEOPLE));
    } catch (e) { /* default voices */ }
    if (typeof buildAllMaps === 'function') {
      const _b = buildAllMaps;
      buildAllMaps = function () { const maps = _b.apply(this, arguments); try { buildMaps(maps); } catch (e) { warnOnce('build', e); } return maps; };
    }
    if (typeof useDeco === 'function') {
      const _ud = useDeco;
      useDeco = function (e) { try { if (useOwn(e)) return undefined; } catch (err) { warnOnce('use', err); } return _ud.apply(this, arguments); };
    }
    if (typeof talk === 'function') {
      const _t = talk;
      talk = function (e) {
        const n = e && e.id === 'sable_wg' && typeof NPCS !== 'undefined' ? NPCS.sable_wg : null;
        if (!n || !hasG() || guest() || !sableReady(G.flags)) return _t.apply(this, arguments);
        const own = n.quest;
        n.quest = function (g) { try { return sableRules(g) || (own ? own.apply(this, arguments) : null); } catch (err) { warnOnce('sable', err); return own ? own.apply(this, arguments) : null; } };
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
  try { wire(); } catch (e) { console.warn('grove31 failed to wire', e); }

  return {
    TX, P, NAMES, MAPS, MOOT_DOORS, GROVE_GATE, YARD_DOORS, TEXTS,
    useOwn, writeName, rollCount, sableRules, sableReady, closeAtLeaving, inLedger,
  };
})();
if (typeof window !== 'undefined') window.GROVE31 = GROVE31;
