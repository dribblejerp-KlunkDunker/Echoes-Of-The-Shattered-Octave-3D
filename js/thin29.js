// ============================================================
//  thin29 — Release road R4, "Fill the thin places": every thin map gets people, something to use and a reason to be there.
//
//    * OAKHAVEN'S BARRED DOORS. The baker's (14,7) and the chandler's (40,29) open onto two new rooms. Agnes Tull, the
//      baker's wife, punches the dough down every hour of the night (Book One: the loaves rise past their tins); Ambrose
//      Vettle [PROPOSED: Book One has no Oakhaven chandler] sells hush-whistles and bandages.
//    * SMALL OAKHAVEN LIFE, all of it a pure function of the clock: the iron-oaks chime when the wind is up; a sapling
//      comes up through the cobbles on Cooper's Row each morning, a hand-saw beside it; the baker's thumping carries at
//      night; the sexton salts the chapel paths at dawn; the tanker-wagon comes through once a day with a Legionnaire
//      escort; dogs howl at noon (Series Bible: since the Cascade, "dogs howl at noon").
//    * NAMED ROUTINES. Bettany, Abner and Old Tam keep a day place and a night place in Oakhaven. They are moved, never
//      hidden (every quest-giver stays talkable), and never while you are talking to them or close by.
//    * THE WATCH DOWNS (danger stays 0, Author Rulings 93-95): Abel Sedge [PROPOSED], a turf-cutter by the fold, says the
//      sign's "There are no sheep" out loud; a turf stack and the dew-pond (a drink, once a day).
//    * WETHERCOMBE: the farmhouse, the barn and the cottage open (Mother Hurst at the hearth, Jem Cotter the shearer, who
//      barred the barn against the woolwight; the cottage is shut up and left); the Bellwether has a room to rent and the
//      slate of tabs.
//    * THE FLUME ROAD: Ennis Crowle, beekeeper (canon: Vol V; the author of "Telling the Bees"), with her skeps. What she
//      says follows Bettany's Telling the Bees.
//    * THE TANNERY: two hands at the vats, and the back door onto the Hollow (shut until R5 builds the Hollow).
//    * THE LOW RINGS AND STILLWATER LANDING: a punt-poler and a salvager in the Rings; a smuggler and a broadsheet-seller
//      from Cantabile on the quay, with a board of broadsheets ("smugglers' town", Vol II).
//
//  The five rooms are new maps, always built (a save may stand in one). Everything added to an existing map is transient
//  (never saved, so no saved entity index moves) and is placed by the clock alone; nothing draws on the random stream.
// ============================================================
'use strict';

const THIN29 = (function () {
  const TEXTS = [];
  const S = (t) => { TEXTS.push(t); return t; };
  const hasG = () => typeof G !== 'undefined' && G && G.map && G.player;
  const F = () => (hasG() && G.flags) || {};
  const gone = () => { const f = F(); return !!(f.greening || f.escaped || f.part3 || f.part4); };
  const here = () => (hasG() ? G.mapId : null);
  const hour = () => { const t = Number(G.tod) || 0; return (((t % 1) + 1) % 1) * 24; };
  const inHours = (h, a, b) => (a <= b ? h >= a && h < b : h >= a || h < b);
  const d2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
  const say = (t, cls, ms) => { try { msg(t, cls || '', ms || 4500); } catch (e) { /* cosmetic */ } };
  const warned = {};
  const warnOnce = (k, e) => { if (!warned[k]) { warned[k] = true; console.warn('thin29: ' + k + ' failed', e); } };
  const guest = () => { try { return typeof SYNC19 !== 'undefined' && !!SYNC19.isGuest(); } catch (e) { return false; } };

  const MAPS = { bakery: 'p29_bakery', chandler: 'p29_chandler', farm: 'p29_farmhouse', barn: 'p29_barn', cottage: 'p29_cottage' };
  const COMBE = 'p22_combe', INN = 'p22_bellwether', DOWNS = 'p20_downs';

  const TX = {
    leave: S('Leave it.'),
    // Oakhaven rooms
    bakery: S('Tull\'s, the baker\'s'),
    bakeryOut: S('Out to the lane'),
    chandler: S('Vettle\'s, the chandler\'s'),
    oven: S('The bread oven'),
    ovenLook: S('The loaves have been rising past their tins for weeks, splitting the crusts and shouldering the oven doors. The dough is never done rising. Nothing in the Reach is done growing.'),
    trough: S('The kneading trough'),
    troughLook: S('A long trough of dough under a damp cloth. It has risen again since she punched it down. It always has.'),
    flour: S('Sacks of flour'),
    candles: S('Dipped candles, hung by their wicks'),
    candlesLook: S('Tallow dips in pairs over a rod, and a few of wax for the chapel, priced in chalk. A box of hush-whistle reeds, cut and tuned, sits on the counter like sweets.'),
    oil: S('Barrels of lamp-oil'),
    thump: S('From behind the baker\'s shutters, a soft, regular thump: the baker\'s wife punching the dough down, as she has every hour of the night.'),
    // small life
    chime: S('The wind gets up, and the iron-oaks begin to ring: a low, sweet chime, like a spoon touched to a bronze bowl, from every tree in the town at once. Hounds love a chime.'),
    noon: S('Noon. Somewhere a dog howls, a quarter-tone wrong, and then another answers it. They have howled at noon since the Cascade.'),
    sapling: S('A sapling in the cobbles'),
    saplingLook: S('A sapling has come up overnight through the cobbles, on the corner by Cooper\'s Row, as thick as your wrist. Someone has already been at it with a hand-saw and given up; the saw is still lying there.'),
    sawIt: S('Saw it down.'),
    sawn: S('You saw it through at the cobbles. The stump is weeping sap before you have set the saw down. It will be back in the morning; it always is.'),
    saw: S('A hand-saw, left in the gutter'),
    salt: S('Salt, in white drifts along the path'),
    saltLook: S('Grave-salt, shovelled from a barrow along the chapel paths. The sexton salts every new grave and binds the jaws of the dead, so that what is buried stays buried and says nothing.'),
    barrow: S('The sexton\'s salt-barrow'),
    tanker: S('Once a day the tanker-wagon comes through: green glass sloshing behind iron grilles, and a Legionnaire walking at each end of it with a bell-shaped helm. Nobody in the street looks at it, very carefully.'),
    wagon: S('The tanker-wagon'),
    // the Downs
    turf: S('A stack of cut turf'),
    turfLook: S('Turves cut square and stacked to dry, grass-side down. Down here they burn turf now; nobody cuts the Hanger.'),
    pond: S('The dew-pond'),
    pondLook: S('A dew-pond, clay-lined, older than anyone. The water is cold and clean, and the turf around it is cropped short as if something still came to drink.'),
    drink: S('Drink from it.'),
    drank: S('You drink. It tastes of stone and cold. You feel a little steadier for it.'),
    drunk: S('You have had your drink today. The pond can spare more, but you cannot tell why you think it would mind.'),
    // Wethercombe
    farmOut: S('Out to the combe'),
    farm: S('The Hursts\' farmhouse'),
    barn: S('The tithe barn'),
    cottage: S('A shut-up cottage'),
    hearth: S('The hearth'),
    note: S('The note from the door'),
    noteLook: S('A note in a big careful hand, the one that was pinned to the door: AT THE FOLD. Underneath, smaller, older: Mother, the soup is on the hook. Do not let it boil.'),
    bales: S('Wool bales, bound'),
    balesLook: S('Last year\'s clip, and the year before\'s, bound and stacked and not sold. There is nobody to sell it to who will come over the Downs.'),
    shears: S('Shears on a nail'),
    letter: S('A letter on the table'),
    letterLook: S('Addressed to nobody and signed by nobody: The key is under the trough. The hens are with Hurst. I have gone up to my sister\'s at Fortis and I am not coming back to a combe where they burn fires on the hill to keep the dark off the ewes. If you are reading this, you are welcome to the apples.'),
    room: S('A room upstairs (3 sovereigns)'),
    roomLook: S('A narrow room under the eaves: a cot, a candle-end and a window that looks at the Downs. Three sovereigns the night, and Gideon\'s lamp on the stair.'),
    roomTake: S('Take the room for the night.'),
    roomBroke: S('Gideon looks at your purse and then at the stair. "Three, I said."'),
    slate: S('The slate of tabs'),
    slateLook: S('Chalked names and what they owe: HURST 4 — COTTER 11 (WOOL) — TAMAR 2 — ABSALOM 0, HE NEVER DRINKS. At the bottom someone has added, in a different hand: THE WOOLWIGHT 1 EWE. Nobody has rubbed it out.'),
    // the Flume Road
    skep: S('A straw skep, humming'),
    skepLook: S('A straw skep on a stone, bound with bramble. It hums low and steady, like a kettle thinking about it. These ones have had their news.'),
    // the tannery
    hollowDoor: S('The back door, to the Hollow'),
    hollowShut: S('The back door gives onto the Hollow, where the town keeps its burl-sick. It is barred on this side, and a slate on the nail says: WARD CLOSED TO CALLERS. ROOKE.'),
    vats: S('The liming vats'),
    // Stillwater and the Low Rings
    board: S('A board of broadsheets'),
    boardLook: S('Cantabile broadsheets, three weeks old and stuck up with fish-glue: the price of Reach timber at Fortis; a woodcut of a bell with a line through it; SYNOD REASSURES. Someone has written beside the last one, in charcoal: SIX TIMES THIS MONTH.'),
    // the routine lines (nothing on screen when nobody moves)
  };

  // ---- people
  const P = {
    p29_agnes: { name: S('Agnes Tull, the baker\'s wife'), sprite: 'townswoman', portrait: 'townswoman', tier: 'low', markup: 1.0, topics: {}, quest: () => null,
      shop: [{ item: 'p12_hearth_bread' }, { item: 'honey' }],
      greet: { polite: S('Mind the flour. I would offer you a chair but they are all full of bread.'), normal: S('Loaves are two, the honey four. I have not slept since the Hedge went up, so do not haggle; I will cry.'), blunt: S('If you want bread, buy bread. If you want to watch me, the shutters are free.') } },
    p29_ambrose: { name: S('Ambrose Vettle, chandler'), sprite: 'townsman', portrait: 'townsman', tier: 'low', markup: 1.1, topics: {}, quest: () => null,
      shop: [{ item: 'whistle' }, { item: 'bandage' }],
      greet: { polite: S('Candles, oil, reeds for the hush-lamps. If it keeps a light lit or a street humming, I have it.'), normal: S('Tallow\'s cheaper. Wax is for the chapel and people who want to be seen buying wax.'), blunt: S('Buy something or let my door shut. Every draught costs me a candle.') } },
    p29_hurst: { name: S('Mother Hurst'), sprite: 'townswoman', portrait: 'townswoman', tier: 'low', topics: {}, quest: () => null,
      greet: { polite: S('Come in off the combe. They are all up at the fold; I mind the soup. There are no sheep, mind. You will have noticed.'), normal: S('There are no sheep. There were, and now there are none, and the turf keeps the shape of them. That is all I know and all I am saying.'), blunt: S('No, there are no sheep. Everybody asks. Shut the door.') } },
    p29_jem: { name: S('Jem Cotter, shearer'), sprite: 'townsman', portrait: 'townsman', tier: 'low', topics: {}, quest: () => null,
      greet: { polite: S('I barred it from the inside because of the woolwight. You came in anyway, so you are either very quiet or not what I thought you were.'), normal: S('Two years of clip and nobody to buy it. I shear what Tamar brings me and I stack it, and I wait for the road to come back.'), blunt: S('Bar the door behind you. Properly. Both pins.') } },
    p29_abel: { name: S('Abel Sedge, turf-cutter'), sprite: 'townsman', portrait: 'townsman', tier: 'low', topics: {}, quest: () => null,
      greet: { polite: S('Read the sign? Sheep-walk. There are no sheep. The turf is short anyway, as if it remembers them. I cut it for the Bellwether\'s fire.'), normal: S('There are no sheep. Nobody says where they went, and I have stopped asking. The combe is down past the stile, if you want people.'), blunt: S('There are no sheep. That is what you came to ask, so there it is.') } },
    p29_ennis: { name: S('Ennis Crowle, beekeeper'), sprite: 'townswoman', portrait: 'townswoman', tier: 'low', markup: 0.9, topics: {}, quest: null,
      shop: [{ item: 'honey' }],
      greet: { polite: S('Softly by the skeps, if you would. They take a voice to heart.'), normal: S('Honey\'s four. The bees do the work; I only tell them things.'), blunt: S('Not so loud. You will put them off their comb.') } },
    p29_sim: { name: S('Sim Fletch, tannery hand'), sprite: 'townsman', portrait: 'townsman', tier: 'low', topics: {}, quest: () => null,
      greet: { polite: S('Abner is outside. He likes the air. I like the work; it stops you hearing the Hollow through the wall.'), normal: S('Lime, then the beam, then the vats. Same as always. The hides are thinner this year, and nobody will say why.'), blunt: S('Mind the vats. They do not care whose hand goes in.') } },
    p29_moll: { name: S('Moll Fletch, tannery hand'), sprite: 'townswoman', portrait: 'townswoman', tier: 'low', topics: {}, quest: () => null,
      greet: { polite: S('That door goes through to the Hollow. Rooke keeps it shut. We hear them in there at night, humming.'), normal: S('Eighty-four in the Hollow, Rooke says, and more since. We send the scraps through for their fires.'), blunt: S('No, you cannot go through. Ask Rooke.') } },
    p29_gil: { name: S('Gil Wade, punt-poler'), sprite: 'p16f_dockman', portrait: 'townsman', tier: 'low', topics: {}, quest: () => null,
      greet: { polite: S('Roof to roof, a penny a pole. I know where the street still has a bottom.'), normal: S('Mind the sinkholes. Where the water goes dark, the street went down with it.'), blunt: S('Pay or wade.') } },
    p29_ysolde: { name: S('Ysolde Marrow, salvager'), sprite: 'p16f_dockwoman', portrait: 'townswoman', tier: 'low', markup: 1.2, topics: {}, quest: () => null,
      fenceRate: 0.45, shop: [{ item: 'flume_eel' }, { item: 'bandage' }],
      shopTalk: { hello: S('Out of the upstairs rooms, mostly. Nobody is coming back for any of it.'), broke: S('Come back with coin. The water is not going anywhere.'), thanks: [S('It is yours now.'), S('Mind it does not go in the water again.')], buys: ['valuable', 'weapon', 'armor', 'consumable'] },
      greet: { polite: S('Salvage, dry and wet. I ask no questions about what you bring me, and you ask none about where I got it.'), normal: S('Smugglers\' town, they call the Landing. The Rings are where the smuggled things go to wait.'), blunt: S('Buying or selling? Talking is extra.') } },
    p29_corvin: { name: S('Corvin Ash, smuggler'), sprite: 'p16f_dockman', portrait: 'townsman', tier: 'low', markup: 1.4, topics: {}, quest: () => null,
      fenceRate: 0.5, shop: [{ item: 'flume_eel' }, { item: 'whistle' }, { item: 'bandage' }],
      shopTalk: { hello: S('Nothing on the manifest, nothing on the quay. Look quick.'), broke: S('Then you are looking, not buying. Looking is how people end up in the basin.'), thanks: [S('Never saw you.'), S('Pleasure.')], buys: ['valuable', 'weapon', 'armor'] },
      greet: { polite: S('Timber goes down to Fortis, broadsheets come up from Cantabile, and some of what is in the barrels is neither.'), normal: S('Tobit sells news; I sell what the news is about.'), blunt: S('Not here. Not loud. Barrels have ears.') } },
    p29_prue: { name: S('Prue Lettice, broadsheet-seller'), sprite: 'p16f_dockwoman', portrait: 'townswoman', tier: 'low', topics: {}, quest: () => null,
      greet: { polite: S('Cantabile sheets, three weeks old, still true. The board is free to read; I only charge for the ones I read aloud.'), normal: S('SYNOD REASSURES, it says, every week. I put it up anyway. People like to see what they are not to believe.'), blunt: S('Read the board. That is what it is for.') } },
    p29_sexton: { name: S('Orrin Pale, sexton'), sprite: 'sexton', portrait: 'townsman', tier: 'low', topics: {}, quest: () => null,
      greet: { polite: S('Salt for the paths, before the town is up. What is buried stays buried, and says nothing.'), normal: S('Mind the drifts. It is not for the hounds; it is for the ones under the turf.'), blunt: S('Out of the barrow\'s road.') } },
  };
  // what Ennis says follows Bettany's Telling the Bees (sidequests.js: p9q_bees, p9q_bees_done)
  const ENNIS = {
    before: S('In the Reach you tell the bees every birth and every death, close and low, or they go out to the lime and do not come home. I wrote it all down once, for anyone who would read it. Nobody tells them anything inside the Hedge any more.'),
    during: S('Bettany\'s, is it? Three skeps, three tellings. Births to the one by her house, the dead in the order of the years, and your own name last, so they know who is speaking. Close, and low.'),
    after: S('Somebody told Bettany\'s bees. I heard it in mine: they hummed a half-tone different, the way they do when the town has remembered itself. Take a jar. It is the bees\' doing, not mine.'),
    gift: S('Ennis Crowle puts a jar of honey in your hands.'),
  };
  P.p29_ennis.quest = (g) => {
    const f = g.flags;
    if (f.p9q_bees_done && !f.p29_ennis_gift) { f.p29_ennis_gift = true; try { g.give('honey'); } catch (e) { /* no inventory */ } say(ENNIS.gift, 'good', 3500); return { text: ENNIS.after }; }
    if (f.p9q_bees === 1 && !f.p9q_bees_done) return { text: ENNIS.during };
    if (!f.p29_ennis_met) { f.p29_ennis_met = true; return { text: ENNIS.before }; }
    return null;
  };

  // ================================================================ sprites (24x24 procedural stand-ins)
  function paint() {
    if (typeof Engine === 'undefined' || !Engine.addSprite) return;
    const mk = (name, draw) => {
      if (Engine.sprites && Engine.sprites[name]) return;
      const w = 24, h = 24, d = new Uint32Array(w * h);
      const px = (x, y, r, g, b) => { if (x >= 0 && y >= 0 && x < w && y < h) d[y * w + x] = (255 << 24) | ((b | 0) << 16) | ((g | 0) << 8) | (r | 0); };
      draw(px); Engine.addSprite(name, { w, h, data: d, hs: 1, cx: 0.5, dy: 0 });
    };
    mk('p29_sapling', (px) => {   // a thin oak sapling out of the cobbles, a few leaves
      for (let y = 8; y < 23; y++) { px(11, y, 92, 70, 44); px(12, y, 74, 56, 34); }
      for (const [x, y] of [[9, 9], [10, 8], [13, 8], [14, 9], [8, 12], [15, 12], [10, 6], [13, 6], [12, 5], [9, 14], [14, 15], [16, 11], [7, 11]]) { px(x, y, 72, 112, 52); px(x + 1, y, 92, 136, 64); px(x, y + 1, 54, 90, 40); }
      for (let x = 7; x < 17; x++) px(x, 23, 70, 66, 60);
    });
    mk('p29_saw', (px) => {   // a hand-saw lying flat
      for (let x = 4; x < 18; x++) { px(x, 19, 168, 172, 176); px(x, 20, 132, 136, 140); if (x % 2 === 0) px(x, 21, 110, 112, 116); }
      for (let x = 18; x < 22; x++) for (let y = 18; y < 22; y++) px(x, y, 112, 74, 40);
    });
    mk('p29_salt', (px) => {   // a low white drift
      for (let x = 2; x < 22; x++) { const top = 19 + Math.round(Math.abs(x - 12) / 3); for (let y = top; y < 24; y++) px(x, y, 226 - (y - top) * 6, 226 - (y - top) * 6, 222 - (y - top) * 6); }
    });
    mk('p29_trough', (px) => {   // a kneading trough with dough under a cloth
      for (let x = 2; x < 22; x++) for (let y = 14; y < 22; y++) { const edge = y === 14 || y === 21 || x === 2 || x === 21; px(x, y, edge ? 84 : 112, edge ? 58 : 80, edge ? 34 : 50); }
      for (let x = 4; x < 20; x++) for (let y = 10; y < 15; y++) { const yy = 10 + Math.round(Math.abs(x - 12) / 4); if (y >= yy) px(x, y, 228, 218, 196); }
      for (let x = 3; x < 21; x++) px(x, 13, 196, 190, 176);
    });
    mk('p29_turf', (px) => {   // stacked turves, grass-side down
      for (let r = 0; r < 4; r++) for (let x = 4 + r; x < 20 - r; x++) for (let y = 20 - r * 3; y < 23 - r * 3; y++) px(x, y, y === 22 - r * 3 ? 64 : 92, y === 22 - r * 3 ? 92 : 66, y === 22 - r * 3 ? 44 : 40);
    });
    mk('p29_bed', (px) => {   // a cot with a grey blanket
      for (let x = 2; x < 22; x++) for (let y = 15; y < 21; y++) px(x, y, y < 17 ? 150 : 104, y < 17 ? 146 : 102, y < 17 ? 140 : 108);
      for (let x = 2; x < 7; x++) for (let y = 13; y < 16; y++) px(x, y, 224, 218, 204);
      for (const x of [2, 21]) for (let y = 21; y < 24; y++) px(x, y, 84, 58, 34);
    });
  }

  // ================================================================ the rooms (new maps: always built)
  function room(id, name, w, h, wall, exit, fill) {
    const m = new GameMap(id, name, w, h, { floor: 't_wood', ceil: 't_wood', fogDist: 18, ambient: 0.3, fogColor: [0, 0, 0], music: 'inside', spawn: { x: exit.sx, y: exit.sy, dir: exit.sdir } });
    m.border(wall);
    m.set(exit.x, exit.y, DOOR({ portal: { map: exit.map, x: exit.ox, y: exit.oy, dir: exit.odir }, label: exit.label }));
    fill(m);
    m.baseCount = m.entities.length;
    return m;
  }
  const look = (m, sprite, x, y, label, text, o) => m.deco(sprite, x, y, Object.assign({ radius: 0.3, scale: 0.7, label, use: 'p29_look', look: text }, o || {}));
  // where each room's door lets out (found from the map, so a moved wall cannot strand anyone)
  function outside(m, x, y) {
    for (const [dx, dy, dir] of [[0, 1, Math.PI / 2], [0, -1, -Math.PI / 2], [1, 0, 0], [-1, 0, Math.PI]]) {
      const nx = x + dx, ny = y + dy;
      if (nx > 0 && ny > 0 && nx < m.w - 1 && ny < m.h - 1 && !m.isBlocked(nx, ny)) return { x: nx + 0.5, y: ny + 0.5, dir };
    }
    return { x: x + 0.5, y: y + 1.5, dir: Math.PI / 2 };
  }
  const OAK_DOORS = { bakery: [14, 7], chandler: [40, 29] };
  const COMBE_DOORS = { farm: [37, 23], barn: [43, 8], cottage: [37, 5] };
  const OUT = {};   // filled when the maps are built: where each room lets out
  function buildRooms(maps) {
    const oak = maps.oakhaven, combe = maps[COMBE];
    const o = (m, d, fb) => (m ? outside(m, d[0], d[1]) : fb);
    OUT.bakery = o(oak, OAK_DOORS.bakery, { x: 14.5, y: 8.5, dir: Math.PI / 2 });
    OUT.chandler = o(oak, OAK_DOORS.chandler, { x: 39.5, y: 29.5, dir: Math.PI });
    OUT.farm = o(combe, COMBE_DOORS.farm, { x: 37.5, y: 22.5, dir: -Math.PI / 2 });
    OUT.barn = o(combe, COMBE_DOORS.barn, { x: 42.5, y: 8.5, dir: Math.PI });
    OUT.cottage = o(combe, COMBE_DOORS.cottage, { x: 36.5, y: 5.5, dir: Math.PI });
    const ex = (k, map, label, x, y, sx, sy, sdir) => ({ x, y, sx, sy, sdir, map, ox: OUT[k].x, oy: OUT[k].y, odir: OUT[k].dir, label });
    if (!maps[MAPS.bakery]) maps[MAPS.bakery] = room(MAPS.bakery, TX.bakery, 10, 7, 't_house', ex('bakery', 'oakhaven', TX.bakeryOut, 5, 6, 5.5, 5.0, -Math.PI / 2), (m) => {
      look(m, 'hearth', 2.0, 1.6, TX.oven, TX.ovenLook, { scale: 0.9, glow: 0.7, radius: 0.45 });
      look(m, 'p29_trough', 6.5, 2.0, TX.trough, TX.troughLook, { scale: 0.9, radius: 0.5 });
      m.deco('crates', 8.4, 4.6, { radius: 0.35, scale: 0.7, label: TX.flour }); m.deco('crates', 8.4, 3.4, { radius: 0.35, scale: 0.6, label: TX.flour });
      m.deco('table', 3.5, 4.2, { radius: 0.5, scale: 0.7 }); m.deco('lamp', 1.4, 5.4, { radius: 0.15, scale: 0.6, glow: 0.6 });
      m.npc('p29_agnes', 5.2, 3.4, { facing: Math.PI / 2 });
    });
    if (!maps[MAPS.chandler]) maps[MAPS.chandler] = room(MAPS.chandler, TX.chandler, 8, 8, 't_wood', ex('chandler', 'oakhaven', TX.bakeryOut, 0, 4, 1.5, 4.5, 0), (m) => {
      look(m, 'shelf', 6.4, 1.5, TX.candles, TX.candlesLook, { scale: 0.8 });
      m.deco('shelf', 6.4, 6.5, { radius: 0.3, scale: 0.8, label: TX.candles });
      m.deco('p_barrel', 1.6, 6.4, { radius: 0.3, scale: 0.65, label: TX.oil }); m.deco('p_barrel', 2.5, 6.6, { radius: 0.3, scale: 0.6, label: TX.oil });
      m.deco('table', 4.5, 3.4, { radius: 0.5, scale: 0.7 }); m.deco('lamp', 1.5, 1.5, { radius: 0.15, scale: 0.6, glow: 0.7 });
      m.npc('p29_ambrose', 5.4, 2.5, { facing: Math.PI });
    });
    if (!maps[MAPS.farm]) maps[MAPS.farm] = room(MAPS.farm, TX.farm, 10, 8, 't_house', ex('farm', COMBE, TX.farmOut, 5, 0, 5.5, 1.5, Math.PI / 2), (m) => {
      m.deco('hearth', 1.6, 5.5, { radius: 0.45, scale: 0.9, glow: 0.7, label: TX.hearth });
      m.deco('table', 5.5, 4.5, { radius: 0.5, scale: 0.7 }); m.deco('lamp', 8.4, 6.4, { radius: 0.15, scale: 0.6, glow: 0.6 });
      look(m, 'sign', 7.5, 1.4, TX.note, TX.noteLook, { solid: false, scale: 0.55, radius: 0.15 });
      m.npc('p29_hurst', 2.6, 4.4, { facing: 0 });
    });
    if (!maps[MAPS.barn]) maps[MAPS.barn] = room(MAPS.barn, TX.barn, 12, 8, 't_wood', ex('barn', COMBE, TX.farmOut, 0, 4, 1.5, 4.5, 0), (m) => {
      for (const [x, y] of [[9.5, 1.6], [10.5, 1.6], [9.5, 2.6], [10.4, 6.4], [9.4, 6.4]]) m.deco('crates', x, y, { radius: 0.4, scale: 0.75, label: TX.bales });
      look(m, 'crates', 10.5, 2.7, TX.bales, TX.balesLook, { scale: 0.7, radius: 0.4 });
      look(m, 'sign', 5.5, 1.3, TX.shears, TX.balesLook, { solid: false, scale: 0.5, radius: 0.15 });
      m.deco('table', 6.0, 4.5, { radius: 0.5, scale: 0.7 }); m.deco('lamp', 3.4, 6.5, { radius: 0.15, scale: 0.6, glow: 0.6 });
      m.npc('p29_jem', 7.4, 4.6, { facing: Math.PI });
      m.item('bandage', 2.5, 1.6);
    });
    if (!maps[MAPS.cottage]) maps[MAPS.cottage] = room(MAPS.cottage, TX.cottage, 8, 6, 't_house', ex('cottage', COMBE, TX.farmOut, 0, 3, 1.5, 3.5, 0), (m) => {
      look(m, 'table', 4.5, 2.5, TX.letter, TX.letterLook, { scale: 0.7, radius: 0.5 });
      m.deco('p29_bed', 6.0, 4.4, { radius: 0.4, scale: 0.8, solid: true });
      m.item('tonic', 6.2, 1.5);
    });
    // the doors into them
    if (oak) syncOakDoors(oak);
    if (combe) for (const k of ['farm', 'barn', 'cottage']) { const [x, y] = COMBE_DOORS[k], sp = maps[MAPS[k]].spawn; combe.set(x, y, DOOR({ portal: { map: MAPS[k], x: sp.x, y: sp.y, dir: sp.dir }, label: TX[k] })); }
    // the tannery's back door onto the Hollow: shut until the Hollow is built (R5)
    const tan = maps.tannery; if (tan && tan.w === 15 && tan.h === 10) tan.set(11, 9, DOOR({ locked: '__never', lockMsg: TX.hollowShut, label: TX.hollowDoor }));
  }
  function syncOakDoors(oak) {
    if (!oak || oak.id !== 'oakhaven') return;
    const open = !gone();
    for (const k of ['bakery', 'chandler']) {
      const [x, y] = OAK_DOORS[k], c = oak.get(x, y);
      if (!c || !c.door) continue;
      if (open) { const sp = { bakery: [5.5, 5.0, -Math.PI / 2], chandler: [1.5, 4.5, 0] }[k]; oak.set(x, y, DOOR({ portal: { map: MAPS[k], x: sp[0], y: sp[1], dir: sp[2] }, label: TX[k] })); }
    }
  }

  // ================================================================ transient people and things on existing maps
  const nearFree = (m, x, y) => {
    const free = (px, py) => { const cx = px | 0, cy = py | 0; if (cx < 1 || cy < 1 || cx >= m.w - 1 || cy >= m.h - 1 || m.isBlocked(cx, cy)) return false; if (m.floorCells && m.floorCells[cy * m.w + cx] === 2 && m.floorTextures && /water/.test(String(m.floorTextures[2]))) return false; return !m.entities.some((o) => o && o.solid && !o.dead && !o.hidden && (o.x - px) * (o.x - px) + (o.y - py) * (o.y - py) < 0.8); };
    if (free(x, y)) return [x, y];
    for (let k = 1; k <= 10; k++) for (let a = 0; a < 8; a++) { const px = x + Math.cos(a * Math.PI / 4) * k * 0.45, py = y + Math.sin(a * Math.PI / 4) * k * 0.45; if (free(px, py)) return [px, py]; }
    return [x, y];
  };
  const keyed = (m, k) => m.entities.find((e) => e && e._p29 === k);
  function put(m, k, make) {
    let e = keyed(m, k); if (e) return e;
    e = Object.assign(make(), { transient: true, _decor: true, _p29: k });
    if (e.kind === 'npc') { e._h = true; e.homeX = e.x; e.homeY = e.y; e.wanderT = 1e9; e.dir = Number.isFinite(e.facing) ? e.facing : 0; e.solid = true; e.radius = 0.35; }
    m.entities.push(e); return e;
  }
  function drop(m, k) { for (let i = m.entities.length - 1; i >= 0; i--) if (m.entities[i] && m.entities[i]._p29 === k) m.entities.splice(i, 1); }
  const person = (id, x, y, facing) => () => ({ kind: 'npc', id, x, y, sprite: P[id].sprite, scale: 1, facing });
  const thing = (sprite, x, y, o) => () => Object.assign({ kind: 'deco', sprite, x, y, solid: false, radius: 0.2, scale: 0.7 }, o || {});
  const at = (m, x, y) => nearFree(m, x, y);

  // per-map placements: [key, when(h) or null, make(m)]
  const PLACE = {
    [DOWNS]: [
      ['abel', null, (m) => { const [x, y] = at(m, 29.2, 34.6); return person('p29_abel', x, y, -Math.PI / 2)(); }],   // east of the fold, off the walkers' line
      ['turf', null, (m) => { const [x, y] = at(m, 30.6, 35.0); return thing('p29_turf', x, y, { solid: true, radius: 0.35, scale: 0.8, label: TX.turf, use: 'p29_look', look: TX.turfLook })(); }],
      ['pond', null, (m) => thing('sign', 10.2, 34.2, { scale: 0.01, radius: 0.6, label: TX.pond, use: 'p29_pond' })()],
    ],
    [INN]: [
      ['bed', null, (m) => { const [x, y] = at(m, 11.6, 9.0); return thing('p29_bed', x, y, { solid: true, radius: 0.4, scale: 0.8, label: TX.room, use: 'p29_room' })(); }],
      ['slate', null, (m) => { const [x, y] = at(m, 4.6, 1.5); return thing('sign', x, y, { scale: 0.55, label: TX.slate, use: 'p29_look', look: TX.slateLook })(); }],
    ],
    flume_road: [
      ['ennis', null, (m) => { const [x, y] = at(m, 5.0, 14.6); return person('p29_ennis', x, y, -Math.PI / 2)(); }],
      ['skep0', null, (m) => { const [x, y] = at(m, 2.6, 16.6); return thing('p9_skep', x, y, { solid: true, radius: 0.35, scale: 0.55, label: TX.skep, use: 'p29_look', look: TX.skepLook })(); }],
      ['skep1', null, (m) => { const [x, y] = at(m, 4.0, 17.0); return thing('p9_skep', x, y, { solid: true, radius: 0.35, scale: 0.55, label: TX.skep, use: 'p29_look', look: TX.skepLook })(); }],
      ['skep2', null, (m) => { const [x, y] = at(m, 5.4, 17.2); return thing('p9_skep', x, y, { solid: true, radius: 0.35, scale: 0.55, label: TX.skep, use: 'p29_look', look: TX.skepLook })(); }],
    ],
    tannery: [
      ['sim', null, (m) => { const [x, y] = at(m, 4.5, 5.6); return person('p29_sim', x, y, Math.PI / 2)(); }],
      ['moll', null, (m) => { const [x, y] = at(m, 10.6, 5.6); return person('p29_moll', x, y, Math.PI / 2)(); }],
    ],
    flume_lowrings: [
      ['gil', null, (m) => { const [x, y] = at(m, 8.5, 12.0); return person('p29_gil', x, y, 0)(); }],
      ['ysolde', null, (m) => { const [x, y] = at(m, 27.5, 10.6); return person('p29_ysolde', x, y, -Math.PI / 2)(); }],
    ],
    flume_landing: [
      ['corvin', null, (m) => { const [x, y] = at(m, 9.4, 12.4); return person('p29_corvin', x, y, Math.PI / 2)(); }],
      ['prue', null, (m) => { const [x, y] = at(m, 17.8, 11.6); return person('p29_prue', x, y, Math.PI)(); }],
      ['board', null, (m) => { const [x, y] = at(m, 19.4, 11.2); return thing('sign', x, y, { scale: 0.75, solid: true, radius: 0.2, label: TX.board, use: 'p29_look', look: TX.boardLook })(); }],
    ],
    oakhaven: [
      // the sapling on the corner by Cooper's Row, every morning until it is sawn
      ['sapling', (h) => inHours(h, 5, 11) && !sawnToday(), (m) => { const [x, y] = at(m, 17.6, 27.4); return thing('p29_sapling', x, y, { solid: true, radius: 0.25, scale: 0.9, label: TX.sapling, use: 'p29_sapling' })(); }],
      ['saw', (h) => inHours(h, 5, 11) && !sawnToday(), (m) => { const s = keyed(m, 'sapling'); return thing('p29_saw', (s ? s.x : 17.6) + 0.55, (s ? s.y : 27.4) + 0.2, { scale: 0.5, label: TX.saw, nopick: true })(); }],
      // the sexton's salt along the chapel paths, and the sexton himself at dawn
      ['salt0', null, () => thing('p29_salt', 47.4, 10.6, { scale: 0.55, label: TX.salt, use: 'p29_look', look: TX.saltLook, nopick: true })()],
      ['salt1', null, () => thing('p29_salt', 49.7, 11.4, { scale: 0.5, label: TX.salt, use: 'p29_look', look: TX.saltLook, nopick: true })()],
      ['salt2', null, () => thing('p29_salt', 47.8, 12.6, { scale: 0.5, label: TX.salt, use: 'p29_look', look: TX.saltLook, nopick: true })()],
      ['sexton', (h) => inHours(h, 5.5, 8), (m) => { const [x, y] = at(m, 46.2, 11.6); return person('p29_sexton', x, y, 0)(); }],
      ['barrow', (h) => inHours(h, 5.5, 8), (m) => { const s = keyed(m, 'sexton'); return thing('p_cart', (s ? s.x : 46.2) - 0.8, (s ? s.y : 11.6) + 0.3, { scale: 0.55, label: TX.barrow })(); }],
    ],
  };
  // the tanker-wagon: a moving thing, its place a pure function of the hour
  const TANKER = { from: 10, to: 10.75, x0: 3.5, x1: 66.5, y: 23.0 };
  function tankerPose(h) { if (h < TANKER.from || h >= TANKER.to) return null; return TANKER.x0 + (TANKER.x1 - TANKER.x0) * (h - TANKER.from) / (TANKER.to - TANKER.from); }

  const said = {};
  const sayDaily = (k, t, cls, ms) => { const key = k + ':' + G.day; if (said[key]) return; said[key] = true; say(t, cls, ms); };
  const sawn = {};
  const sawnToday = () => !!sawn[(G && G.day) || 0];
  const drank = {};

  function syncMap(m) {
    if (!m || !Array.isArray(m.entities)) return;
    const list = PLACE[m.id];
    if (list) {
      const oakOk = m.id !== 'oakhaven' || (m.w === 70 && m.h === 64 && !gone());
      const h = hour();
      for (const [k, when, make] of list) { if (oakOk && (!when || when(h))) put(m, k, () => make(m)); else drop(m, k); }
    }
    if (m.id === 'oakhaven') {
      const x = !gone() && m.w === 70 ? tankerPose(hour()) : null;
      if (x == null) { drop(m, 'wagon'); drop(m, 'legA'); drop(m, 'legB'); }
      else {
        const w = put(m, 'wagon', thing('p9_wagon', x, TANKER.y, { scale: 0.95, radius: 0.5, label: TX.wagon }));
        const a = put(m, 'legA', thing('legionnaire', x - 1.6, TANKER.y + 0.4, { scale: 1.0 }));
        const b = put(m, 'legB', thing('legionnaire', x + 1.6, TANKER.y - 0.4, { scale: 1.0 }));
        w.x = x; a.x = x - 1.6; b.x = x + 1.6;
      }
    }
  }

  // ================================================================ named routines in Oakhaven (moved, never hidden)
  const ROUTINES = [
    { id: 'bettany', day: [7, 19], dayAt: [51.5, 17.6, Math.PI / 2], nightAt: [28.5, 29.2, Math.PI / 2] },
    { id: 'hob', day: [6, 18], dayAt: [15.5, 55.5, 0], nightAt: [9.4, 40.5, 0] },
    { id: 'tam', day: [7, 19], dayAt: [29.5, 56.2, -Math.PI / 2], nightAt: [54.2, 47.6, Math.PI / 2] },
  ];
  function placeFor(r, h) { return inHours(h, r.day[0], r.day[1]) ? r.dayAt : r.nightAt; }
  function routines(force) {
    const m = G.map; if (!m || m.id !== 'oakhaven' || m.w !== 70 || gone()) return;
    const h = hour(), c = Engine.cam;
    for (const r of ROUTINES) {
      const e = m.entities.find((o) => o && o.kind === 'npc' && o.id === r.id && !o.transient); if (!e) continue;
      const [x, y, f] = placeFor(r, h);
      if (Math.abs(e.homeX - x) < 0.01 && Math.abs(e.homeY - y) < 0.01) continue;
      // not mid-conversation, and not where you would see them vanish
      if (!force && ((typeof DLG !== 'undefined' && DLG.ent === e && G.state === 'dialogue') || d2(e.x, e.y, c.x, c.y) < 144 || d2(x, y, c.x, c.y) < 144)) continue;
      e.x = x; e.y = y; e.homeX = x; e.homeY = y; e.facing = f;
    }
  }

  // ================================================================ the ambient life of Oakhaven
  const lastH = { v: null };
  function ambient() {
    if (here() !== 'oakhaven' || gone()) return;
    const h = hour(), c = Engine.cam, prev = lastH.v; lastH.v = h;
    // dogs at noon (the moment the hour turns)
    if (prev != null && prev < 12 && h >= 12 && h < 12.5) { sayDaily('noon', TX.noon, 'warn', 6000); try { Audio_.sfx.hound(); } catch (e) { /* no audio */ } }
    // the iron-oaks, when the wind is up: once an hour at most
    const wind = (typeof Weather !== 'undefined' && Number(Weather.wind)) || 0;
    if (wind > 0.35) { const key = 'chime:' + G.day + ':' + Math.floor(h); if (!said[key]) { said[key] = true; say(TX.chime, '', 5500); try { Audio_.sfx.bell(); } catch (e) { /* no audio */ } } }
    // the baker's thumping, heard at night near her shutters
    if (inHours(h, 21, 5) && d2(c.x, c.y, OAK_DOORS.bakery[0] + 0.5, OAK_DOORS.bakery[1] + 1) < 25) sayDaily('thump', TX.thump, '', 6000);
    // the tanker-wagon, seen
    const x = tankerPose(h); if (x != null && d2(x, TANKER.y, c.x, c.y) < 196) sayDaily('tanker', TX.tanker, 'warn', 7000);
  }

  // ================================================================ uses
  function lookAt(e) { showEvent(e.label || '', e.look || '', [{ t: TX.leave, f: null }]); }
  function useOwn(e) {
    if (!e || typeof e.use !== 'string' || e.use.indexOf('p29_') !== 0) return false;
    if (e.use === 'p29_look') { lookAt(e); return true; }
    if (e.use === 'p29_sapling') {
      showEvent(TX.sapling, TX.saplingLook, [{ t: TX.sawIt, f: () => { sawn[G.day || 0] = true; try { addNoise(1.6); } catch (err) { /* no noise */ } say(TX.sawn, '', 5000); syncMap(G.map); } }, { t: TX.leave, f: null }]);
      return true;
    }
    if (e.use === 'p29_pond') {
      const k = G.day || 0;
      showEvent(TX.pond, TX.pondLook, [{ t: TX.drink, f: () => { if (drank[k]) { say(TX.drunk, '', 3500); return; } drank[k] = true; const p = G.player; p.hp = Math.min(p.hpMax, p.hp + 4); p.fat = Math.min(p.fatMax, (p.fat || 0) + 10); say(TX.drank, 'good', 3500); } }, { t: TX.leave, f: null }]);
      return true;
    }
    if (e.use === 'p29_room') {
      showEvent(TX.room, TX.roomLook, [{ t: TX.roomTake, f: () => { if ((G.player.gold || 0) < 3) { say(TX.roomBroke, 'bad', 3500); return; } G.player.gold -= 3; renderRest(); } }, { t: TX.leave, f: null }]);
      return true;
    }
    return false;
  }

  // ================================================================ the tick and the wiring
  function tick() {
    if (!hasG() || G.state !== 'play' || guest()) return;
    try { syncMap(G.map); } catch (e) { warnOnce('sync', e); }
    try { routines(false); } catch (e) { warnOnce('routines', e); }
    try { ambient(); } catch (e) { warnOnce('ambient', e); }
  }
  function onLoad() {
    if (!hasG()) return;
    lastH.v = null;
    try { syncMap(G.map); routines(true); } catch (e) { warnOnce('load', e); }
  }
  function wire() {
    paint();
    if (typeof NPCS !== 'undefined') for (const k in P) if (!NPCS[k]) NPCS[k] = P[k];
    // their voices (js/voices.js): pitch, throat, style, from who they are
    try {
      if (typeof VOICES !== 'undefined' && VOICES.PEOPLE) Object.assign(VOICES.PEOPLE, Object.assign({
        p29_agnes: { f0: 204, fs: 1.04, style: 'human' }, p29_ambrose: { f0: 122, fs: 0.95, style: 'human' },
        p29_hurst: { f0: 176, fs: 1.0, style: 'human' }, p29_jem: { f0: 112, fs: 0.94, style: 'human' },
        p29_abel: { f0: 104, fs: 0.92, style: 'human' }, p29_ennis: { f0: 196, fs: 1.02, style: 'human' },
        p29_sim: { f0: 128, fs: 0.96, style: 'human' }, p29_moll: { f0: 212, fs: 1.06, style: 'human' },
        p29_gil: { f0: 118, fs: 0.95, style: 'human' }, p29_ysolde: { f0: 186, fs: 1.02, style: 'human' },
        p29_corvin: { f0: 110, fs: 0.93, style: 'human' }, p29_prue: { f0: 220, fs: 1.08, style: 'human' },
        p29_sexton: { f0: 100, fs: 0.91, style: 'human' },
      }, VOICES.PEOPLE));
    } catch (e) { /* default voices */ }
    if (typeof buildAllMaps === 'function') {
      const _b = buildAllMaps;
      buildAllMaps = function () { const maps = _b.apply(this, arguments); try { buildRooms(maps); } catch (e) { warnOnce('build', e); } return maps; };
    }
    if (typeof buildOakhaven === 'function') {
      const _bo = buildOakhaven;
      buildOakhaven = function () { const m = _bo.apply(this, arguments); try { syncOakDoors(m); } catch (e) { warnOnce('doors', e); } return m; };
    }
    if (typeof LAW_MAPS !== 'undefined') { LAW_MAPS.add(MAPS.bakery); LAW_MAPS.add(MAPS.chandler); }
    if (typeof useDeco === 'function') {
      const _ud = useDeco;
      useDeco = function (e) { try { if (useOwn(e)) return undefined; } catch (err) { warnOnce('use', err); } return _ud.apply(this, arguments); };
    }
    if (typeof updateNarrow === 'function') {   // the game's own update calls this every frame of play
      const _un = updateNarrow;
      updateNarrow = function () { const r = _un.apply(this, arguments); tick(); return r; };
    }
    for (const fn of ['loadMap', 'restoreGame']) {
      if (typeof window[fn] !== 'function') continue;
      const _f = window[fn];
      window[fn] = function () { const r = _f.apply(this, arguments); onLoad(); return r; };
    }
    if (typeof passHours === 'function') {
      const _ph = passHours;
      passHours = function () { const r = _ph.apply(this, arguments); try { if (hasG()) { syncMap(G.map); routines(true); } } catch (e) { warnOnce('hours', e); } return r; };
    }
  }
  try { wire(); } catch (e) { console.warn('thin29 failed to wire', e); }

  return {
    TX, P, ENNIS, MAPS, OAK_DOORS, COMBE_DOORS, ROUTINES, PLACE, TANKER, TEXTS,
    syncMap, routines, placeFor, tankerPose, inHours, useOwn,
    get out() { return OUT; },
  };
})();
if (typeof window !== 'undefined') window.THIN29 = THIN29;
