// ============================================================
//  sheepwalk22 — Phase 22, "The Sheep-Walk": the Watch Downs become a region (Phase 20-21 Author Rulings).
//
//  The rulings promoted the Downs from a one-map walk to the first map of a new region, and settled the route: nothing
//  new joins Oakhaven, a new place joins only the map it is seen from (or a new map beside it), every map passes the
//  Downs' reach checks, and a painted landmark that becomes real stands at its painted bearing. This module builds:
//    * WETHERCOMBE (p22_combe), a chalk combe south of the Downs and west of Oakhaven, joined to the Downs ONLY, by a
//      stile in the Downs' south hedge. It holds the farmsteads, barns and orchards painted on Oakhaven's skyline, the
//      Farrants' fold, the Bellwether (a drovers' inn), the Wether brook, the Chalk Ram cut into the west slope, the
//      beacons on Hob's Knap and Ewe Barrow, and on Pylon Hill the snapped iron pylon painted on the clearing's skyline
//      at bearing 2.07 (it stands there: see PYLON below). Danger 1: hounds den under the pylon.
//    * THE BELLWETHER (p22_bellwether), the inn's taproom, joined to Wethercombe only.
//    * SHEEP. The ruling's answer stands: the Downs flocks were shorn for the Hedge's wool, kept inside it, and eaten in
//      the two shut years. Tamar Farrant has brought a new flock up the hill (Rust Coast ewes, carried in the
//      Drift-Kestrel's hold) [PROPOSED]. Sheep graze, walk, bleat and can be stroked; strays follow you home.
//    * FOUR THINGS TO DO: Strays (five ewes over two maps, led back to the fold), The Scouring (six stakes on the Chalk
//      Ram, an hour's work each, the figure turning white as you go), Three Fires (the fold-fires on the Long Down, Hob's
//      Knap and Ewe Barrow, burning every night once lit), and The Iron Hum (the pylon's singing wire, and the hounds
//      it calls). Apples in the orchard, once a day a tree.
//    * MUTTON: six dishes (salt mutton, broth, chops, pie, hotpot, roast leg) at every inn and every seller of food or
//      provisions in the game: Hetty at the Boar & Dulcimer gets a menu, Brenna Loft, the market provisioner, Captain
//      Vane's stores (Kestrel and Whisper-Grove), Fenwick Sloe's chandlery, and the Bellwether and the Farrants.
//
//  State: G.flags only, prefix p22w_, each 0/1 or a small integer, validated on every read. Sheep, flowers, followers
//  and the lit fires are TRANSIENT entities rebuilt from the flags on every loadMap (never saved). The two new maps
//  are built deterministically and their baseCount is set once; the Downs gain one door cell and nothing else.
//  Rules kept: wrappers only (buildAllMaps, loadMap, update, useDeco, useItem); no markup is built from save data;
//  presentation randomness comes from a private generator, so the game's own random stream is never drawn.
//  Art: procedural canvas stand-ins, cached once. Every invented fact or line is [PROPOSED] (see
//  story/Game Layer/Phase 22 - New In-Game Text.md); all player-visible text is in TX, registered through S().
// ============================================================
'use strict';

const SHEEPWALK22 = (function () {
  const DOWNS = 'p20_downs', COMBE = 'p22_combe', INN = 'p22_bellwether';
  const CW = 60, CH = 60;                         // Wethercombe's size in cells
  // Where Wethercombe sits in Oakhaven's coordinates (oak = map + OFF), beside the Downs (oak = downs + (-40, -37)):
  // its row 0 lies under the Downs' south hedge (row 37). The stile is Downs column 12 = Wethercombe column 34.
  const OFF = [-62, 1], DOWNS_OFF = [-40, -37];
  const STILE_DOWNS = [12, 37];
  const STILE = [STILE_DOWNS[0] + DOWNS_OFF[0] - OFF[0], 0];
  // the snapped pylon, at the bearing the clearing's panorama paints it (2.07 rad; 0 is east, pi/2 is south)
  const PYLON = [48.5, 50.5];
  const FOLD = { x0: 31, y0: 32, x1: 37, y1: 37, cx: 34.5, cy: 34.8, r: 2.4, gate: [34, 35] };
  const INN_DOOR = [30, 20];
  const FP = 'p22w_';
  const LIST = [];
  const S = (t) => { LIST.push(t); return t; };
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const hasG = () => typeof G !== 'undefined' && G && G.flags && typeof G.flags === 'object';
  const num = (v, lo, hi, d) => { v = Number(v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.floor(v))) : d; };
  const flag = (k, hi) => hasG() && has(G.flags, FP + k) ? num(G.flags[FP + k], 0, hi || 1, 0) : 0;
  const setFlag = (k, v, hi) => { if (hasG()) G.flags[FP + k] = num(v, 0, hi || 1, 0); };
  const today = () => hasG() ? num(G.day, 0, 99999, 0) : 0;
  const hour = () => hasG() ? (((Number(G.tod) || 0) % 1) + 1) % 1 * 24 : 12;
  const night = () => { const h = hour(); return h >= 19.5 || h < 5.5; };
  const warned = new Set();
  const warnOnce = (k, e) => { if (warned.has(k)) return; warned.add(k); try { console.warn('sheepwalk22: ' + k, e); } catch (x) { /* no console */ } };
  const stats = { sheep: 0, flowers: 0, fires: 0, followers: 0, bleats: 0, ticks: 0, lush: 0, trees: 0 };
  // private presentation stream: the game's Math.random and its rolls are never drawn by anything in here
  let seed = 22022;
  const prand = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const seeded = (a) => () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  // ================================================================ text [PROPOSED], every line
  const TX = {
    combe: S('Wethercombe'),
    inn: S('The Bellwether'),
    stileIn: S('A stile in the thorn, and a drove-road down into Wethercombe'),
    stileOut: S('The stile, back up onto the Watch Downs'),
    innDoor: S('The Bellwether: a drovers\' inn, its door open'),
    innOut: S('Out to the yard'),
    sign: S('A finger-post at the foot of the drove-road: WETHERCOMBE. The other arm points south, and someone has painted over its word. Under the paint you can still read PYLON.'),
    innSign: S('The Bellwether. A ram on the board, with a bell at his throat. The paint is new and the board is old.'),
    farmDoor: S('The Farrants\' door. A note is pinned to it: AT THE FOLD.'),
    barnDoor: S('The barn door is barred from inside. Through the crack: hay to the roof beams, and the smell of a winter that never came.'),
    cotDoor: S('A shepherd\'s cottage, shut up. The thatch has a hole you could put a ewe through.'),
    well: S('The combe well. Somebody has scrubbed the bucket and hung it back on the hook.'),
    skep: S('Straw bee-skeps on a bench. The bees came back before the people did.'),
    hay: S('A haystack, roped down against the wind.'),
    cart: S('A wool-cart with one wheel off, the bed still grey with lanolin.'),
    brook: S('The Wether brook, cold off the chalk. You can see every stone on its bed.'),
    spring: S('The Wether spring. It comes out of the chalk as clear as glass and goes over a lip of flint in a little fall.'),
    ford: S('Stepping stones across the brook.'),
    tree: S('An apple tree, heavy with fruit. Somebody has been propping the low branches.'),
    treePicked: S('You have had this tree\'s best apple today. Leave the rest for the wasps.'),
    treePick: S('You pick a red Wethercombe apple, cold and sharp.'),
    lantern: S('A lantern on a stake, for the orchard at night.'),
    woodpile: S('A woodpile of furze faggots, cut for the beacons.'),
    reach: {
      bellash: S('A bell-ash. Its seed-keys are bronze, and in any wind at all the tree rings, very small, like a shop door a long way off.'),
      glassthorn: S('A glass-thorn: a hawthorn whose haws have set as beads of Light-glass. Each one holds a point of light, day or night.'),
      lanternbell: S('Lantern-bells. After dark they give off a pale blue light, enough to read a ledger by, if the ledger is small.'),
      whistlegrass: S('Whistle-grass, hollow and silver. In a wind the slope hums with it.'),
      echopoppy: S('Echo-poppies. Shepherds say they remember the last thing said near them. Nobody says anything near them.'),
    },
    trees: { beech: S('A beech, smooth and grey as a seal, the first leaves turning.'), ash: S('An ash, last into leaf and first out of it.'), yew: S('A yew, older than the barrow it guards, or nearly.'), haw: S('A hawthorn, red with haws.') },
    bench: S('A bench somebody carried all the way up here. The whole of Wethercombe is under you: the fold, the orchard, the brook, and across the valley the Ram.'),
    flowers: S('Harebell, scabious and wild thyme. The chalk is never too poor for these.'),
    wallStile: S('A gap in the dry-stone wall.'),
    barrow: S('Ewe Barrow: a long mound older than any name for it. Its door is a slab of grey sarsen, set in the chalk and not meant to move. Someone has laid a sprig of thyme on the sill.'),
    hut: S('A shepherd\'s hut on iron wheels, its door open to the wind. A bed-shelf, a broken lantern, a tally-stick with notches up to forty and then no more.'),
    tent: S('A surveyor\'s tent, the canvas stamped with a Consortium serial. The stakes are rusted in. A folding stool lies on its side where somebody got up in a hurry.'),
    cairnHint: S('A beacon of chalk and flint round an iron basket. The furze in it is dry.'),
    pylonHum: S('The pylon hums. It is not the wind. A wire runs from its broken top down to an iron box at its foot, and the wire sings.'),
    pylonQuiet: S('The pylon stands silent, the singing wire hanging in two pieces. Rust, and wind, and nothing else.'),
    ramHint: S('A survey stake with a rag on it, driven into the turf over the chalk.'),
    ramDone: S('White chalk, scoured clean. From here it is only a white patch. From the valley it is the Ram.'),
    // the Downs' finger-post, once the flock is home (the original line keeps "There are no sheep" until then)
    downsSign: S('A finger-post with one arm left: THE WATCH DOWNS. Under it someone has cut, small, SHEEP-WALK. There are Farrant ewes on it again, and the turf is short because of them.'),
    sheep: {
      ewe: S('A Rust Coast ewe, dark-faced, in a fleece the colour of old cream.'),
      lamb: S('A lamb. It looks at you as if you might be its mother, and decides not.'),
      tup: S('The tup, with a bell at his throat: the bellwether. Where he goes, the flock goes.'),
      stray: S('A ewe on her own, a long way from the others. Her ear is notched with the Farrants\' mark.'),
      follow: S('She looks at you, and then at the hill, and falls in behind you.'),
      home: S('The ewe sees the fold and trots the last of it, bleating. Somebody in the flock answers.'),
      stroke: [S('You rub the ewe\'s poll. She leans into it and goes on chewing.'), S('Lanolin on your hand, and the smell of wet wool.'), S('She stamps a foot at you, and then lets you.'), S('The fleece is warm a finger deep, and cold on the top.')],
      waits: S('The ewes will not come indoors. They wait outside.'),
    },
    tamar: {
      name: S('Tamar Farrant, shepherd'),
      polite: S('Mind the gate, love. It is the only thing between them and the whole of the Reach.'),
      normal: S('Farrant. We had the sheep-walk off the Downs for six generations. I am the seventh, and I am starting again.'),
      blunt: S('If you have come to tell me the hill is not safe, I know. The sheep do not.'),
      intro: S('You came over the Downs? Then you saw no sheep. There were none to see. — Eleven Rust Coast ewes and a tup, Captain Vane brought me up in his hold from Cantabile, and charged me for the smell. Two nights back a hound came down the combe and ran them. Six came home. Five are out on the hill, on the Downs, under the pylon, and I cannot leave the rest to fetch them. They will follow anyone who is calm. Will you?'),
      hedge: S('Every sheep in the Reach went into the Hedge. They sheared them for the wool the town packed into the roots, and they drove the Downs flocks in behind the thorn after. Two years shut in. We ate them. Ours too. I fed my children my father\'s ewes, one a month, and I would do it again. Nothing took them. We did.'),
      combe: S('Wethercombe was the sheep-walk\'s door: the fold, the fair, the Bellwether for the drovers. When the Hedge went up we all went in. I am the first back. Gideon came after me, because somebody has to feed me.'),
      progress: S('{0} of the five home. They are out on the Downs and in the combe, mostly where the grass is sweetest or the danger is worst. One went south, under the pylon.'),
      thanks: S('That is the five. That is all of them.') ,
      reward: S('All of them home. — Here. My mother\'s mantle, Farrant wool, felted. It hushes you the way the Hedge-cloth does, and it is warmer. And take some mutton: I will not pretend I do not sell it. A flock that is not eaten is a flock nobody keeps.'),
      after: S('The flock is back on the Downs, the turf is going short, and the Ram is white. My father would not know what to say. Neither do I.'),
      hello: S('Fleece-wool and mutton, both off this hill.'),
      broke: S('That is not enough for a chop, love.'),
      thanksShop: [S('Eat it hot.'), S('Off this hill, that.'), S('Mind your teeth on the bone.')],
    },
    kit: {
      name: S('Kit Farrant, at the fold'),
      polite: S('Mam says I\'m to watch the fold and not the hill. I watch the hill.'),
      normal: S('Have you seen the Ram? You can\'t, he\'s gone green.'),
      blunt: S('I\'m not scared of hounds. I\'m not.'),
      intro: S('The Ram on the hill. He\'s gone green, all over, you can hardly see him. Gran said he has to be scoured every seven years or he walks off the hill and takes the flock with him. It\'s been ten. There\'s six stakes up there where the old men marked him. Will you do it? I\'d do it but Mam says I\'m to watch the fold.'),
      progress: S('{0} stakes scoured. I can see his {1} from here!'),
      parts: [S('nose'), S('horn'), S('chest'), S('back'), S('haunch'), S('tail')],
      done: S('He\'s white! He\'s all white! Mam! — Gran said you give the scourer a ram\'s-horn button for luck. I only have one. It\'s yours.'),
      after: S('He\'s not going anywhere now.'),
    },
    gideon: {
      name: S('Gideon Thrale of the Bellwether'),
      polite: S('Sit where the light is. The fire is mutton-fat and it smokes, but it is warm.'),
      normal: S('Rooms are a sovereign. Supper is whatever Tamar can spare, and she can spare more than she lets on.'),
      blunt: S('I opened an inn on a road nobody walks. Say something I have not already said to myself.'),
      topic: S('The Bellwether was the drovers\' house. Eight hundred sheep a fair-day went past that door. I had it from my uncle and shut it with my own hands the night the Hedge closed, and I opened it again the week Tamar came back up.'),
      hello: S('Mutton six ways, and cider, and apples off the orchard. The roast is for people who have walked a long way.'),
      broke: S('Put it back, friend. I cannot give it away; I tried, and it went badly.'),
      thanks: [S('Eat it by the fire.'), S('Tamar\'s, that. Tell her it was good.'), S('There. Somebody ought to enjoy something.')],
    },
    absalom: {
      name: S('Absalom Rudd, the old beacon-keeper'),
      polite: S('Sit down, sit down. My knees have been asking after company.'),
      normal: S('Three fires on three hills. I lit them forty back-ends running. Then the Hedge.'),
      blunt: S('Talk louder. No. Do not. Talk the way you were.'),
      intro: S('The fold-fires. Not war fires, whatever the Synod told you: shepherds\' fires. At the back-end of the year you lit the Long Down, Hob\'s Knap and Ewe Barrow, and every flock on the hills came down to the light. Nobody has lit them since the wool went into the Hedge. My legs will not do the hills. Here is my tinder-box. Furze faggots from the woodpile by the barn, one to a beacon. Light them, and the sheep-walk is open again. Everybody will see it.'),
      progress: S('{0} of the three. I can see them from the window, you know. I sit and look.'),
      done: S('Three fires. Look at that. Look at that. — That is a beacon-keeper\'s purse; there is nobody else to give it to. They will burn every night now. I will see to it, from this chair, by telling Kit.'),
      after: S('Every night, now. Three fires. The sheep come down to them.'),
      topic: S('Long Down to the north, over the Downs; Hob\'s Knap east, above the orchard; Ewe Barrow west, on the old mound. You can see all three from the Knap, if your eyes are better than mine.'),
    },
    fire: {
      none: S('The beacon wants a furze faggot and a light. There is a woodpile by the barn.'),
      noTinder: S('You have furze, but nothing to light it with. Absalom Rudd at the Bellwether keeps a tinder-box.'),
      lit: S('The furze takes with a roar. The beacon burns, and out on the hills the dark has a point in it.'),
      already: S('The beacon is burning. You can feel it on your face from here.'),
      day: S('The beacon is laid and lit and burning low in daylight. It will show when the dark comes.'),
      furze: S('You pull a furze faggot off the woodpile. It is dry, and it prickles through your gloves.'),
      furzeFull: S('You are carrying all the furze you need.'),
    },
    pylon: {
      hounds: S('The wire sings, and something under the pylon answers it. The hounds are still here. Deal with them first.'),
      event: S('The Iron Hum'),
      body: S('The pylon is iron lattice, snapped two-thirds of the way up, the top hanging off like a broken wing. From the break a single wire runs down to an iron box at the foot, and the wire is singing: one note, steady, under hearing almost, a hum you feel in your back teeth. A brass plate on the box: CONSORTIUM OF BORES — WESTERN TALLY LINE — STATION 6. Cut it, and the hounds lose their lodestone.'),
      cut: S('Cut the singing wire.'),
      leave: S('Leave it humming.'),
      done: S('The wire parts with a crack and the note stops. Out on the hill the hounds\' silence is a different silence. In the iron box, under a tin lid, someone left a tally-book.'),
    },
    scour: {
      event: S('The Chalk Ram'),
      body: S('The stake marks a part of the figure. The turf has crept over the chalk here, a finger deep. Scouring it clean is an hour on your knees with a spade and a stiff brush.'),
      go: S('Scour this part (an hour).'),
      leave: S('Leave it for now.'),
      did: S('An hour, and the chalk under the turf comes up white as a plate. Down in the valley, a part of the Ram you could not see this morning is there.'),
      all: S('The last of the turf comes away. You stand up and look down the hill and he is there, the whole of him: nose, horn, chest, back, haunch and tail, white on the green, the way he was cut before anyone wrote anything down.'),
    },
    items: {
      salt: { name: S('Salt Mutton'), desc: S('A slab of mutton in a salt crust, the Reach\'s staple. Restores 8 health and 15 fatigue.'), eat: S('Salt, and more salt, and somewhere under it mutton. You drink twice what you meant to.') },
      broth: { name: S('Mutton Broth'), desc: S('A crock of clear broth with barley at the bottom. Restores 12 voice, 6 health and 15 fatigue.'), eat: S('Hot broth, fat on the top. Your throat unknots.') },
      chops: { name: S('Mutton Chops'), desc: S('Two chops off the griddle, black at the edges. Restores 14 health and 20 fatigue.'), eat: S('You eat them with your fingers. Nobody here will say anything.') },
      pie: { name: S('Mutton Pie'), desc: S('A raised pie of chopped mutton and onion in a hot-water crust. Restores 16 health and 25 fatigue.'), eat: S('The crust is lard and the filling is pepper and the whole of it is warm.') },
      hotpot: { name: S('Mutton and Barley Hotpot'), desc: S('Mutton, barley and onions under sliced potatoes, baked all afternoon. Restores 20 health, 6 voice and 30 fatigue.'), eat: S('You eat it out of the dish with a spoon, and then with the heel of the bread.') },
      roast: { name: S('Roast Leg of Mutton'), desc: S('A slice off the leg with rosemary and the drippings, and bread to wipe the plate. Restores 30 health, 10 voice and 40 fatigue.'), eat: S('Rosemary and fat and smoke. For a minute the Reach is a kind place.') },
      apple: { name: S('Wethercombe Apple'), desc: S('A red apple off the Bellwether\'s orchard. Restores 3 health and 10 fatigue.'), eat: S('Sharp, cold, and all the way to the core.') },
      furze: { name: S('Furze Faggot'), desc: S('A bound bundle of dry gorse for a beacon.') },
      tinder: { name: S('Absalom\'s Tinder-box'), desc: S('A beacon-keeper\'s brass tinder-box, the lid worn smooth by a thumb.') },
      tally: { name: S('Station Six Tally-book'), desc: S('A Consortium tally-book from the pylon\'s iron box. Column after column of one number, a pitch, logged every hour; then, in 417, one line: LINE DEAD BOTH ENDS. HEDGE.') },
      button: { name: S('Ram\'s-horn Button'), desc: S('A button carved from a ram\'s horn, from the scouring of the Ram. For luck.') },
      mantle: { name: S('Farrant Fleece Mantle'), desc: S('Felted Farrant wool, the colour of the chalk. Hushes your footsteps like the Hedge-cloth, and is warmer.') },
    },
    journal: {
      flock: S('Tamar Farrant has brought a flock back up to Wethercombe. Five of her ewes are out: on the Watch Downs, in the combe, and one under the pylon. They will follow anyone calm. I said I would bring them home to the fold.'),
      flockDone: S('All five of Tamar Farrant\'s ewes are home in the fold at Wethercombe.'),
      ram: S('Kit Farrant asked me to scour the Chalk Ram on the west side of Wethercombe: six stakes, an hour\'s work at each, until the figure is white again.'),
      ramDone: S('I scoured the Chalk Ram above Wethercombe. You can see him from the whole valley.'),
      fires: S('Absalom Rudd gave me his tinder-box to light the fold-fires: the Long Down on the Watch Downs, Hob\'s Knap above the orchard, and Ewe Barrow on the west ridge. A furze faggot for each, from the woodpile by the Farrants\' barn.'),
      firesDone: S('The three fold-fires are lit. They will burn on the Downs and over Wethercombe every night now.'),
      flockClosed: S('We left the Reach before all of Tamar Farrant\'s ewes were home. I hope the ones still out on the Downs keep to the high grass.'),
      ramClosed: S('The Chalk Ram above Wethercombe is only half scoured. Nobody will finish him now.'),
      firesClosed: S('We left the Reach before all of Absalom Rudd\'s fold-fires were lit. He will light the rest himself, if he is still there to.'),
      pylon: S('I cut the singing wire on the pylon above Wethercombe. It was a Consortium tally-line, and it was still calling the hounds.'),
      truth: S('Tamar Farrant told me what became of the Downs flocks: shorn for the Hedge\'s wool, driven inside it, and eaten in the two shut years. Nothing took them. The town did.'),
    },
    hetty: { hello: S('Salt mutton, off Captain Vane\'s boat, and dear. The flocks went two winters ago; it is that or broth, love.'), broke: S('That\'s not a supper\'s worth, love.'), thanks: [S('Sit down to it.'), S('Mind, it\'s hot.'), S('There. Eat it slowly; it\'s the last till Driftday.')] },
  };
  const fmt = (s, ...a) => String(s).replace(/\{(\d)\}/g, (m, i) => a[+i] !== undefined ? a[+i] : m);

  // ================================================================ art (procedural stand-ins, painted once)
  function paint(w, h, fn) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true });
    fn(x, w, h);
    const id = x.getImageData(0, 0, w, h);
    return new Uint32Array(id.data.buffer.slice(0));
  }
  const E = (x, cx, cy, rx, ry, fill, rot) => { x.beginPath(); x.ellipse(cx, cy, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2); x.fillStyle = fill; x.fill(); };
  const R = (x, x0, y0, w, h, fill) => { x.fillStyle = fill; x.fillRect(x0, y0, w, h); };
  const P = (x, pts, fill, stroke, lw) => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]); x.closePath(); if (fill) { x.fillStyle = fill; x.fill(); } if (stroke) { x.strokeStyle = stroke; x.lineWidth = lw || 1; x.stroke(); } };
  const L = (x, x0, y0, x1, y1, col, lw) => { x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.strokeStyle = col; x.lineWidth = lw || 1; x.stroke(); };
  const VG = (x, y0, y1, a, b) => { const g = x.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  const RG = (x, cx, cy, r, a, b) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
  const addSprite = (name, w, h, fn, meta) => {
    if (typeof Engine === 'undefined' || !Engine.addSprite || (Engine.sprites && Engine.sprites[name])) return;
    Engine.addSprite(name, Object.assign({ w, h, data: paint(w, h, fn), hs: 1, cx: 0.5, dy: 0 }, meta || {}));
  };
  // an emissive mask from the warm, bright pixels of a sprite (flames, lit windows)
  function flameMask(sp) {
    const m = new Uint8Array(sp.w * sp.h);
    for (let i = 0; i < m.length; i++) { const p = sp.data[i], a = p >>> 24, r = p & 255, g = (p >> 8) & 255, b = (p >> 16) & 255; if (a > 100 && r > 200 && g > 110 && b < 120) m[i] = 1; }
    return m;
  }

  // a sheep, side-on, facing left. pose: 0 stand, 1 walk (legs crossed), 2 graze (head down). k: 1 ewe, 0.62 lamb.
  function drawSheep(x, w, h, pose, opts) {
    const o = opts || {}, k = o.k || 1, cream = o.fleece || '#e9e1cc', shade = o.shade || '#bdb39c', face = o.face || '#2f2824';
    const by = h - 13 * k;                                              // belly line
    E(x, w * 0.52, h - 2, w * 0.4, 2.2, 'rgba(0,0,0,0.32)');
    // legs: four thin dark legs; walking crosses a pair
    const lg = (lx, sw) => { R(x, lx + sw, by + 2 * k, 2.6 * k, h - by - 4, '#2a2420'); R(x, lx + sw - 0.4, h - 3.4, 3.4 * k, 1.6, '#151210'); };
    const sw = pose === 1 ? 2.2 * k : 0;
    lg(w * 0.30, sw); lg(w * 0.38, -sw); lg(w * 0.70, -sw); lg(w * 0.78, sw);
    // the fleece: overlapping lumps, light from above-left
    const bx = w * 0.56, bw = w * 0.36, bh = 9.5 * k;
    E(x, bx, by - bh * 0.5, bw, bh, shade);
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, rx = bx + Math.cos(a) * bw * 0.72, ry = by - bh * 0.6 + Math.sin(a) * bh * 0.55; E(x, rx, ry, 5.2 * k, 4.4 * k, i < 5 ? cream : shade); }
    E(x, bx - 2 * k, by - bh * 0.75, bw * 0.8, bh * 0.7, cream);
    for (let i = 0; i < 14; i++) { const px = bx - bw * 0.8 + (i * 37 % 100) / 100 * bw * 1.6, py = by - bh * 1.2 + (i * 53 % 100) / 100 * bh; E(x, px, py, 1.6 * k, 1.2 * k, 'rgba(255,252,240,0.55)'); }
    // tail
    E(x, bx + bw * 0.98, by - bh * 0.6, 2.4 * k, 4 * k, shade);
    // neck and head
    const hx = pose === 2 ? w * 0.18 : w * 0.17, hy = pose === 2 ? h - 7 * k : by - bh * 1.3;
    P(x, [[bx - bw * 0.7, by - bh * 1.05], [hx + 5 * k, hy - 2 * k], [hx + 7 * k, hy + 4 * k], [bx - bw * 0.6, by - bh * 0.2]], cream);
    E(x, hx + 4 * k, hy - 1.2 * k, 4.6 * k, 3.4 * k, cream);                      // poll wool
    E(x, hx, hy + 1.5 * k, 5.2 * k, 3.3 * k, face, pose === 2 ? 0.9 : -0.25);       // face
    E(x, hx - 3.6 * k, hy + (pose === 2 ? 4.5 : 2.6) * k, 2 * k, 1.6 * k, '#3a302a');  // muzzle
    E(x, hx + 4.8 * k, hy - 0.4 * k, 3.4 * k, 1.3 * k, face, 0.5);                  // ear
    R(x, hx - 1.4 * k, hy + 0.2 * k, 1.4, 1.2, '#d8c27a');                          // the eye catches the light
    if (o.horns) {                                                                  // the tup's curled horns
      x.strokeStyle = '#b9a988'; x.lineWidth = 2.6 * k; x.beginPath(); x.arc(hx + 4.5 * k, hy + 1 * k, 4.2 * k, -2.6, 1.4); x.stroke();
      x.strokeStyle = 'rgba(80,66,44,0.6)'; x.lineWidth = 0.8; x.beginPath(); x.arc(hx + 4.5 * k, hy + 1 * k, 4.2 * k, -2.6, 1.4); x.stroke();
    }
    if (o.bell) { L(x, hx + 6 * k, hy + 5 * k, hx + 9 * k, hy + 7 * k, '#5a4428', 1); E(x, hx + 7.6 * k, hy + 8.6 * k, 2.2 * k, 2.6 * k, '#c9a24a'); E(x, hx + 7.6 * k, hy + 10.4 * k, 1.8 * k, 0.8 * k, '#6e5426'); }
    if (o.mark) R(x, bx + bw * 0.2, by - bh * 1.15, 4 * k, 3 * k, 'rgba(150,40,30,0.75)');   // the Farrants' raddle mark
  }

  function paintSheep() {
    for (const [name, pose] of [['p22_ewe', 0], ['p22_ewe_w', 1], ['p22_ewe_g', 2]]) addSprite(name, 52, 36, (x, w, h) => drawSheep(x, w, h, pose, { mark: true }));
    for (const [name, pose] of [['p22_lamb', 0], ['p22_lamb_w', 1], ['p22_lamb_g', 2]]) addSprite(name, 36, 26, (x, w, h) => drawSheep(x, w, h, pose, { k: 0.66, fleece: '#f4efe0', shade: '#cfc7b2', face: '#3a322c' }));
    for (const [name, pose] of [['p22_tup', 0], ['p22_tup_w', 1], ['p22_tup_g', 2]]) addSprite(name, 58, 42, (x, w, h) => drawSheep(x, w, h, pose, { k: 1.14, fleece: '#e2d8bf', shade: '#b0a68e', horns: true, bell: true, mark: true }));
  }

  function paintProps() {
    // an apple tree in fruit: a round low crown on a short leaning trunk, red apples, the low branches propped
    for (const [name, sd, fruit] of [['p22_apple', 3, 26], ['p22_apple2', 9, 18]]) addSprite(name, 80, 92, (x, w, h) => {
      const r = seeded(sd);
      E(x, 40, 89, 26, 3, 'rgba(0,0,0,0.3)');
      P(x, [[34, 90], [38, 52], [44, 52], [46, 90]], VG(x, 52, 90, '#6a5238', '#3a2a1c'));
      L(x, 40, 60, 22, 46, '#4a3828', 3); L(x, 42, 58, 60, 44, '#4a3828', 3); L(x, 22, 48, 18, 88, '#6a5a40', 1.6);
      for (let i = 0; i < 30; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()), cx = 40 + Math.cos(a) * d * 30, cy = 34 + Math.sin(a) * d * 22; E(x, cx, cy, 8 + r() * 5, 6 + r() * 4, ['#3f6a2a', '#4f7c32', '#5d8a38', '#35592a'][(r() * 4) | 0]); }
      for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()), cx = 40 + Math.cos(a) * d * 28, cy = 30 + Math.sin(a) * d * 18; E(x, cx, cy, 3, 2.2, 'rgba(160,200,90,0.45)'); }
      for (let i = 0; i < fruit; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()), cx = 40 + Math.cos(a) * d * 28, cy = 38 + Math.sin(a) * d * 18; E(x, cx, cy, 2.4, 2.4, '#b8281e'); E(x, cx - 0.8, cy - 0.8, 0.9, 0.9, '#f08060'); }
    });
    // a beacon: a cairn of chalk and flint, an iron basket on a pole, furze laid in it
    const beacon = (x, lit) => {
      E(x, 32, 94, 26, 3.5, 'rgba(0,0,0,0.32)');
      P(x, [[8, 94], [20, 74], [44, 74], [56, 94]], VG(x, 74, 94, '#d8d2c0', '#9a9384'));
      for (let i = 0; i < 18; i++) E(x, 12 + (i * 29 % 40), 78 + (i * 13 % 14), 2.6, 1.8, i % 3 ? '#4a4c54' : '#e8e2d0');
      R(x, 30, 34, 4, 42, '#2e2a26'); R(x, 30, 34, 1.4, 42, '#5a524a');
      P(x, [[18, 22], [46, 22], [40, 38], [24, 38]], null, '#2a2622', 2.4);
      for (let i = 0; i < 4; i++) L(x, 20 + i * 8, 22, 25 + i * 5, 38, '#2a2622', 1.4);
      if (!lit) { for (let i = 0; i < 9; i++) L(x, 20 + i * 3, 23, 22 + i * 2.6, 12 + (i % 3) * 3, '#6a5a2a', 1.6); E(x, 32, 22, 12, 4, '#7a6a34'); return; }
      E(x, 32, 22, 20, 18, 'rgba(255,170,60,0.22)');
      P(x, [[20, 26], [24, 8], [29, 16], [32, -2], [36, 14], [40, 4], [44, 26]], '#f0782a');
      P(x, [[24, 26], [28, 12], [32, 4], [36, 12], [40, 26]], '#ffc04a');
      P(x, [[28, 26], [32, 12], [36, 26]], '#fff2b0');
      for (let i = 0; i < 6; i++) E(x, 22 + i * 4, 26, 3, 2, '#ffde7a');
    };
    addSprite('p22_beacon', 64, 96, (x) => beacon(x, false));
    addSprite('p22_beacon_lit', 64, 96, (x) => beacon(x, true));
    try { Engine.setEmissive('p22_beacon_lit', flameMask(Engine.sprites.p22_beacon_lit)); if (typeof ANIM !== 'undefined' && ANIM.fire && ANIM.fire.add) ANIM.fire.add('p22_beacon_lit'); } catch (e) { /* plain */ }
    // the snapped pylon: iron lattice tapering up, broken two-thirds of the way, the top hanging; the singing wire
    const pylon = (x, w, h, cut) => {
      const rust = '#5a3a28', iron = '#3a3634', hi = '#7a5a40';
      E(x, w / 2, h - 3, w * 0.42, 4, 'rgba(0,0,0,0.35)');
      const legL = (t) => [w * 0.12 + t * (w * 0.36), h - 6 - t * (h * 0.68)], legR = (t) => [w * 0.88 - t * (w * 0.36), h - 6 - t * (h * 0.68)];
      x.lineCap = 'round';
      L(x, legL(0)[0], legL(0)[1], legL(1)[0], legL(1)[1], iron, 4); L(x, legR(0)[0], legR(0)[1], legR(0.86)[0], legR(0.86)[1], iron, 4);
      L(x, legL(0)[0] + 1, legL(0)[1], legL(1)[0] + 1, legL(1)[1], rust, 1.4);
      for (let i = 0; i < 9; i++) {
        const a = i / 9, b = (i + 1) / 9; if (b > 0.88) break;
        const [ax, ay] = legL(a), [bx2, by2] = legR(b), [cx, cy] = legR(a), [dx, dy] = legL(b);
        L(x, ax, ay, bx2, by2, iron, 1.6); L(x, cx, cy, dx, dy, iron, 1.6); L(x, ax, ay, cx, cy, i % 2 ? rust : iron, 2);
      }
      // the crossarm, and the broken top hanging off to the right
      const [tx, ty] = legL(1);
      L(x, tx - 12, ty + 10, tx + 26, ty + 10, iron, 3); L(x, tx - 10, ty + 10, tx - 10, ty + 16, hi, 1.4);
      P(x, [[legR(0.86)[0], legR(0.86)[1]], [legR(0.86)[0] + 18, legR(0.86)[1] + 26], [legR(0.86)[0] + 24, legR(0.86)[1] + 62], [legR(0.86)[0] + 18, legR(0.86)[1] + 64], [legR(0.86)[0] + 12, legR(0.86)[1] + 30]], null, iron, 2.2);
      L(x, legR(0.86)[0] + 14, legR(0.86)[1] + 30, legR(0.86)[0] + 22, legR(0.86)[1] + 50, rust, 1.4);
      // insulators, and the wire
      for (const ix of [tx - 10, tx + 24]) { E(x, ix, ty + 18, 2.2, 3, '#a8b8b0'); E(x, ix, ty + 15, 2.6, 1.2, '#c8d8d0'); }
      if (!cut) { x.strokeStyle = '#2a2a2a'; x.lineWidth = 1.1; x.beginPath(); x.moveTo(tx - 10, ty + 20); x.quadraticCurveTo(w * 0.2, h * 0.6, w * 0.36, h - 18); x.stroke(); }
      else { x.strokeStyle = '#2a2a2a'; x.lineWidth = 1.1; x.beginPath(); x.moveTo(tx - 10, ty + 20); x.quadraticCurveTo(tx - 16, ty + 60, tx - 12, ty + 96); x.stroke(); x.beginPath(); x.moveTo(w * 0.36, h - 18); x.quadraticCurveTo(w * 0.3, h - 30, w * 0.24, h - 24); x.stroke(); }
      // the iron box at the foot
      R(x, w * 0.3, h - 22, 14, 16, '#3a3634'); R(x, w * 0.3, h - 22, 14, 3, '#5a5450'); R(x, w * 0.3 + 4, h - 15, 6, 4, '#a08a50');
      // rust streaks
      for (let i = 0; i < 20; i++) { const t = (i * 37 % 100) / 100, [px, py] = (i % 2 ? legL : legR)(t * 0.8); R(x, px - 1, py, 2, 3 + (i % 4), 'rgba(140,70,40,0.55)'); }
    };
    addSprite('p22_pylon', 96, 330, (x, w, h) => pylon(x, w, h, false));
    addSprite('p22_pylon_cut', 96, 330, (x, w, h) => pylon(x, w, h, true));
    // the inn sign: a post and arm, a board with a ram and a bell
    addSprite('p22_innsign', 56, 110, (x) => {
      E(x, 14, 107, 10, 2.4, 'rgba(0,0,0,0.3)');
      R(x, 11, 8, 6, 100, VG(x, 8, 108, '#5a4630', '#3a2c1e')); R(x, 11, 10, 42, 5, '#4a3826');
      L(x, 22, 15, 22, 22, '#2a2622', 1.2); L(x, 48, 15, 48, 22, '#2a2622', 1.2);
      R(x, 18, 22, 34, 30, '#2c3a4a'); R(x, 18, 22, 34, 2, '#c9a24a'); R(x, 18, 50, 34, 2, '#c9a24a'); R(x, 18, 22, 2, 30, '#c9a24a'); R(x, 50, 22, 2, 30, '#c9a24a');
      x.save(); x.translate(18, 22); drawSheep(x, 34, 28, 0, { k: 0.62, horns: true, bell: true }); x.restore();
    });
    // a survey stake with a rag; done: a stake by a heap of scoured turf, the chalk white round it
    addSprite('p22_stake', 24, 52, (x) => {
      E(x, 12, 50, 8, 2, 'rgba(0,0,0,0.3)'); R(x, 10, 6, 4, 44, '#7a6040'); R(x, 10, 6, 1.4, 44, '#a08060');
      P(x, [[14, 8], [23, 11], [21, 15], [14, 14]], '#b83a2a'); L(x, 14, 9, 22, 12, 'rgba(255,200,180,0.5)', 0.8);
    });
    addSprite('p22_stake_done', 40, 52, (x) => {
      E(x, 20, 49, 16, 3, 'rgba(255,255,250,0.5)'); E(x, 30, 46, 8, 4, '#4e6a34'); E(x, 30, 44, 6, 2.4, '#6a8a44');
      R(x, 10, 6, 4, 44, '#7a6040'); P(x, [[14, 8], [23, 11], [21, 15], [14, 14]], '#e8e0d0');
    });
    // the woodpile of furze faggots by the barn
    addSprite('p22_furze', 72, 44, (x) => {
      E(x, 36, 41, 32, 3, 'rgba(0,0,0,0.3)');
      for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - row; i++) {
        const cx = 16 + i * 14 + row * 7, cy = 34 - row * 9;
        E(x, cx, cy, 8, 5, '#6a5a2c'); for (let s = 0; s < 7; s++) L(x, cx - 7, cy - 3 + s, cx + 7, cy - 4 + s * 1.2, s % 2 ? '#8a7a3a' : '#4a3e20', 0.9);
        R(x, cx - 1, cy - 5, 2, 10, '#c9a24a'); for (let s = 0; s < 3; s++) E(x, cx - 6 + s * 5, cy - 4, 1.2, 1, '#e8c840');
      }
    });
    // the surveyor's tent, slumped; a folding stool on its side
    addSprite('p22_tent', 96, 64, (x) => {
      E(x, 48, 61, 44, 3, 'rgba(0,0,0,0.3)');
      P(x, [[8, 60], [44, 12], [90, 60]], VG(x, 12, 60, '#b8ac88', '#7a7058')); P(x, [[44, 12], [60, 60], [90, 60]], 'rgba(0,0,0,0.18)');
      P(x, [[38, 60], [46, 30], [54, 60]], '#2a2420'); L(x, 44, 12, 44, 4, '#5a4630', 2);
      R(x, 60, 34, 16, 6, '#3a3634'); L(x, 70, 40, 74, 52, '#5a4630', 1.4); L(x, 74, 40, 70, 52, '#5a4630', 1.4);
      R(x, 16, 40, 18, 4, 'rgba(60,50,30,0.5)'); x.fillStyle = 'rgba(40,30,20,0.6)'; x.font = '6px monospace'; x.fillText('C/B 0417', 18, 50);
    });
    // a shepherd's hut on iron wheels
    addSprite('p22_hut', 104, 80, (x) => {
      E(x, 52, 77, 46, 3, 'rgba(0,0,0,0.3)');
      R(x, 10, 28, 84, 38, VG(x, 28, 66, '#5a5a52', '#3a3a34')); for (let i = 0; i < 9; i++) L(x, 10, 31 + i * 4, 94, 31 + i * 4, 'rgba(0,0,0,0.25)', 1);
      x.beginPath(); x.moveTo(6, 30); x.quadraticCurveTo(52, 6, 98, 30); x.lineTo(98, 34); x.quadraticCurveTo(52, 12, 6, 34); x.closePath(); x.fillStyle = '#4a4a44'; x.fill();
      R(x, 60, 36, 16, 30, '#1a1816'); R(x, 76, 36, 3, 30, '#3a2c1e');
      R(x, 22, 40, 14, 10, '#2a2a28'); R(x, 23, 41, 12, 8, 'rgba(160,170,150,0.4)');
      for (const wx of [24, 80]) { E(x, wx, 68, 9, 9, '#2a2622'); E(x, wx, 68, 6, 6, '#4a4440'); for (let s = 0; s < 6; s++) L(x, wx, 68, wx + Math.cos(s) * 8, 68 + Math.sin(s) * 8, '#2a2622', 1); }
      R(x, 98, 54, 6, 3, '#3a2c1e');
    });
    // the sarsen door of Ewe Barrow
    addSprite('p22_sarsen', 64, 72, (x) => {
      E(x, 32, 69, 30, 3, 'rgba(0,0,0,0.3)');
      P(x, [[8, 70], [10, 14], [22, 4], [44, 4], [56, 16], [56, 70]], VG(x, 4, 70, '#9a968a', '#5e5a52'));
      for (let i = 0; i < 12; i++) E(x, 14 + (i * 23 % 38), 14 + (i * 31 % 50), 3 + (i % 3), 2, i % 2 ? 'rgba(120,140,90,0.45)' : 'rgba(60,58,50,0.4)');
      L(x, 30, 8, 26, 60, 'rgba(40,38,34,0.5)', 1); R(x, 26, 64, 10, 3, '#7a8a4a');
    });
    // wildflowers: three small clumps (harebell blue, scabious lilac, thyme pink, a little yellow)
    const flowers = (x, cols, sd) => {
      const r = seeded(sd);
      for (let i = 0; i < 9; i++) { const sx = 4 + r() * 24, sy = 14 + r() * 4; L(x, sx, 22, sx + (r() - 0.5) * 3, sy, '#4f7a34', 1); }
      for (let i = 0; i < 9; i++) { const cx = 3 + r() * 26, cy = 10 + r() * 9, c = cols[(r() * cols.length) | 0]; E(x, cx, cy, 1.8, 1.5, c); E(x, cx - 0.4, cy - 0.5, 0.7, 0.6, 'rgba(255,255,255,0.5)'); }
    };
    addSprite('p22_flowers1', 32, 22, (x) => flowers(x, ['#6a7ad8', '#8a96e8', '#e8d050'], 5));
    addSprite('p22_flowers2', 32, 22, (x) => flowers(x, ['#b088d0', '#c8a0e0', '#f0f0f0'], 8));
    addSprite('p22_flowers3', 32, 22, (x) => flowers(x, ['#d888b0', '#e0a0c0', '#e8d050'], 13));
    // a cider barrel on a stand, a hand-cart and a well already exist; a trough of water for the fold
    addSprite('p22_trough', 64, 28, (x) => {
      E(x, 32, 26, 30, 2, 'rgba(0,0,0,0.3)'); R(x, 4, 8, 56, 16, VG(x, 8, 24, '#8a8478', '#5a554c')); R(x, 7, 9, 50, 5, '#5a7a84'); R(x, 7, 9, 50, 1.4, '#9ab8c0');
    });
    // a hurdle (woven wattle panel) for the fold gate
    addSprite('p22_hurdle', 64, 40, (x) => {
      E(x, 32, 38, 30, 2, 'rgba(0,0,0,0.25)');
      for (let i = 0; i < 7; i++) R(x, 6 + i * 9, 4, 3, 34, '#6a5438');
      for (let j = 0; j < 7; j++) { x.strokeStyle = j % 2 ? '#8a7048' : '#7a6040'; x.lineWidth = 2.6; x.beginPath(); x.moveTo(4, 8 + j * 4.4); for (let i = 0; i < 7; i++) x.lineTo(7 + i * 9, 8 + j * 4.4 + ((i + j) % 2 ? 1.6 : -1.6)); x.stroke(); }
    });
  }

  // trees and undergrowth for the chalk country (procedural stand-ins): beech, ash, yew, hawthorn in haw, elder; bracken,
  // fern, cow parsley, foxglove, tall grasses, nettle, thistle, reedmace
  function paintFlora() {
    const leafy = (x, r, cx, cy, rx, ry, n, cols, hi) => {
      for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()), px = cx + Math.cos(a) * d * rx, py = cy + Math.sin(a) * d * ry; E(x, px, py, 5 + r() * 6, 4 + r() * 5, cols[(r() * cols.length) | 0]); }
      for (let i = 0; i < n * 0.6; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()), px = cx + Math.cos(a) * d * rx * 0.9, py = cy - ry * 0.2 + Math.sin(a) * d * ry * 0.7; E(x, px - 1, py - 1, 2.6, 2, hi); }
    };
    addSprite('p22_beech', 112, 150, (x) => {
      const r = seeded(31);
      E(x, 56, 147, 34, 3.5, 'rgba(0,0,0,0.3)');
      P(x, [[48, 148], [50, 84], [54, 60], [60, 60], [64, 84], [66, 148]], VG(x, 60, 148, '#9a9a90', '#5e605a'));
      L(x, 52, 140, 54, 70, 'rgba(255,255,255,0.18)', 2); L(x, 56, 84, 30, 52, '#6e6e66', 4); L(x, 58, 80, 86, 48, '#6e6e66', 4);
      leafy(x, r, 56, 48, 50, 38, 80, ['#3e6428', '#4c7630', '#5a8434', '#365a24', '#6a9038'], 'rgba(170,210,110,0.5)');
      for (let i = 0; i < 14; i++) E(x, 14 + r() * 84, 20 + r() * 50, 3, 2, 'rgba(200,170,60,0.55)');   // the first turned leaves
    });
    addSprite('p22_ash', 96, 140, (x) => {
      const r = seeded(37);
      E(x, 48, 137, 26, 3, 'rgba(0,0,0,0.3)');
      P(x, [[44, 138], [45, 70], [50, 70], [52, 138]], VG(x, 70, 138, '#8c8a7c', '#56544a'));
      for (const [a, b, c, d] of [[47, 80, 22, 40], [48, 76, 76, 34], [48, 70, 46, 20]]) L(x, a, b, c, d, '#6a685c', 2.4);
      for (let i = 0; i < 140; i++) { const px = 8 + r() * 80, py = 10 + r() * 70; if (Math.hypot((px - 48) / 42, (py - 44) / 36) > 1) continue; E(x, px, py, 2.4, 1.2, ['#5a8a3a', '#6e9c44', '#4a7a32', '#86ac54'][(r() * 4) | 0], r() * 3); }
    });
    addSprite('p22_yew', 80, 112, (x) => {
      const r = seeded(41);
      E(x, 40, 109, 28, 3, 'rgba(0,0,0,0.35)');
      P(x, [[34, 110], [36, 80], [44, 80], [46, 110]], VG(x, 80, 110, '#8a4a30', '#4a2618'));
      for (let i = 0; i < 9; i++) { const y = 10 + i * 9, w = 10 + i * 3.6; P(x, [[40, y - 6], [40 - w, y + 12], [40 + w, y + 12]], ['#1e3a22', '#24442a', '#183420'][i % 3]); }
      for (let i = 0; i < 40; i++) { const px = 12 + r() * 56, py = 14 + r() * 80; E(x, px, py, 1.6, 1, 'rgba(90,140,90,0.45)'); }
      for (let i = 0; i < 8; i++) E(x, 16 + r() * 48, 40 + r() * 50, 1.6, 1.6, '#c8282a');
    });
    addSprite('p22_haw', 72, 70, (x) => {
      const r = seeded(43);
      E(x, 36, 67, 26, 3, 'rgba(0,0,0,0.3)');
      L(x, 34, 68, 30, 40, '#4a3a2a', 4); L(x, 31, 50, 14, 30, '#4a3a2a', 2.4); L(x, 32, 46, 56, 28, '#4a3a2a', 2.4);
      leafy(x, r, 36, 30, 32, 22, 46, ['#3a5a26', '#46682c', '#2e4c20'], 'rgba(150,190,90,0.4)');
      for (let i = 0; i < 40; i++) E(x, 8 + r() * 56, 12 + r() * 36, 1.5, 1.5, ['#b0201a', '#d0302a'][(r() * 2) | 0]);
    });
    addSprite('p22_elder', 60, 52, (x) => {
      const r = seeded(47);
      E(x, 30, 50, 24, 2.6, 'rgba(0,0,0,0.3)');
      for (const [a, b] of [[22, 20], [30, 14], [40, 22]]) L(x, 30, 50, a, b, '#6a5a44', 2);
      leafy(x, r, 30, 26, 26, 18, 34, ['#3a6a2a', '#4a7a30', '#2e5a22'], 'rgba(160,200,100,0.45)');
      for (let i = 0; i < 7; i++) { const cx = 10 + r() * 40, cy = 14 + r() * 22; for (let k = 0; k < 9; k++) E(x, cx + (r() - 0.5) * 7, cy + (r() - 0.5) * 4, 1.2, 1.2, '#2a1a30'); }
    });
    const fronds = (x, r, n, cols, len) => { for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (r() - 0.5) * 2.4, l = len * (0.6 + r() * 0.5), sx = x.canvas.width / 2 + (r() - 0.5) * 6, sy = x.canvas.height - 2; const ex = sx + Math.cos(a) * l, ey = sy + Math.sin(a) * l * 0.8; x.strokeStyle = cols[i % cols.length]; x.lineWidth = 1.4; x.beginPath(); x.moveTo(sx, sy); x.quadraticCurveTo((sx + ex) / 2, ey - 4, ex, ey); x.stroke(); for (let k = 1; k < 7; k++) { const t = k / 7, px = sx + (ex - sx) * t, py = sy + (ey - sy) * t - 3 * Math.sin(t * 3); L(x, px, py, px + 4, py - 2.4, cols[(i + k) % cols.length], 1.2); L(x, px, py, px - 4, py - 2.4, cols[(i + k) % cols.length], 1.2); } } };
    addSprite('p22_bracken', 48, 34, (x) => fronds(x, seeded(53), 7, ['#8a9a3a', '#a0a840', '#7a8a34', '#b09440'], 26));
    addSprite('p22_fern', 40, 32, (x) => fronds(x, seeded(59), 8, ['#3e7a32', '#4c8a38', '#356a2c'], 22));
    addSprite('p22_cowparsley', 34, 46, (x) => {
      const r = seeded(61);
      for (let i = 0; i < 5; i++) { const sx = 6 + r() * 22, top = 6 + r() * 14; L(x, 17, 45, sx, top + 4, '#5a7a3a', 1.2); for (let k = 0; k < 10; k++) E(x, sx + (r() - 0.5) * 9, top + (r() - 0.5) * 3, 1.4, 1.2, k % 3 ? '#f2f0e4' : '#e0dcc8'); }
      for (let i = 0; i < 5; i++) E(x, 10 + r() * 14, 36 + r() * 8, 4, 2, '#4a7030');
    });
    addSprite('p22_foxglove', 20, 50, (x) => {
      const r = seeded(67);
      L(x, 10, 49, 10, 8, '#4a6a34', 1.4); for (let i = 0; i < 6; i++) E(x, 6 + r() * 8, 44 + r() * 4, 4, 1.8, '#4a7030');
      for (let i = 0; i < 9; i++) { const y = 10 + i * 3.6, s = i % 2 ? 1 : -1; E(x, 10 + s * 2.4, y, 2.4, 1.8, i < 2 ? '#c890c0' : '#a8509a'); E(x, 10 + s * 2.6, y + 0.6, 0.8, 0.6, '#f0e0f0'); }
    });
    const blades = (x, r, n, cols, h, heads) => { const w = x.canvas.width, hh = x.canvas.height; for (let i = 0; i < n; i++) { const sx = w / 2 + (r() - 0.5) * w * 0.6, l = h * (0.6 + r() * 0.5), lean = (r() - 0.5) * 10, ex = sx + lean, ey = hh - l; x.strokeStyle = cols[i % cols.length]; x.lineWidth = 1.1; x.beginPath(); x.moveTo(sx, hh - 1); x.quadraticCurveTo(sx + lean * 0.2, hh - l * 0.6, ex, ey); x.stroke(); if (heads && r() < 0.7) E(x, ex, ey - 1, 1.2, 3, heads); } };
    addSprite('p22_tallgrass1', 36, 40, (x) => blades(x, seeded(71), 22, ['#7a8a44', '#8c9a4c', '#6a7a3a', '#a8a460'], 34, '#c0b070'));
    addSprite('p22_tallgrass2', 36, 34, (x) => blades(x, seeded(73), 26, ['#5a7a34', '#6a8a3c', '#4c6a2e'], 28, null));
    addSprite('p22_nettle', 30, 30, (x) => { const r = seeded(79); for (let i = 0; i < 5; i++) { const sx = 6 + r() * 18; L(x, sx, 29, sx + (r() - 0.5) * 3, 6 + r() * 6, '#3e5a2a', 1.2); for (let k = 0; k < 4; k++) { const y = 10 + k * 5 + r() * 2; E(x, sx - 3, y, 3, 1.6, '#3a6428', -0.4); E(x, sx + 3, y, 3, 1.6, '#3a6428', 0.4); } } });
    addSprite('p22_thistle', 24, 34, (x) => { const r = seeded(83); L(x, 12, 33, 12, 8, '#5a7a4a', 1.4); for (let i = 0; i < 5; i++) E(x, 12 + (i % 2 ? 4 : -4), 14 + i * 4, 4, 1.4, '#6a8a5a', i % 2 ? 0.5 : -0.5); E(x, 12, 8, 3.4, 3, '#4a6a3a'); for (let i = 0; i < 9; i++) L(x, 12, 6, 12 + (i - 4) * 1.1, 1, '#b060c0', 1.1); void r; });
    addSprite('p22_reedmace', 22, 56, (x) => { const r = seeded(89); for (let i = 0; i < 4; i++) { const sx = 4 + r() * 14, top = 6 + r() * 10; L(x, sx, 55, sx + (r() - 0.5) * 2, top, '#6a7a3a', 1.2); R(x, sx - 1.6, top + 3, 3.2, 10, '#5a3a22'); L(x, sx, top + 3, sx, top - 3, '#8a8a5a', 0.8); } for (let i = 0; i < 6; i++) L(x, 11, 55, 2 + r() * 18, 14 + r() * 20, '#7a8a44', 1); });
  }

  // the Reach's own [PROPOSED]: the bell-ash (bronze seed-keys that chime), the glass-thorn (haws of Light-glass that
  // catch the light), lantern-bells (a woodland flower that glows after dark), whistle-grass (hollow silver stems that
  // sing in a wind), echo-poppies (red, and said to remember the last thing said near them)
  function paintFantasy() {
    addSprite('p22_bellash', 96, 140, (x) => {
      const r = seeded(97);
      E(x, 48, 137, 26, 3, 'rgba(0,0,0,0.3)');
      P(x, [[44, 138], [45, 70], [50, 70], [52, 138]], VG(x, 70, 138, '#9a9282', '#5a5446'));
      for (const [a, b, c, d] of [[47, 80, 20, 42], [48, 76, 78, 36], [48, 70, 46, 18]]) L(x, a, b, c, d, '#6a685c', 2.4);
      for (let i = 0; i < 120; i++) { const px = 8 + r() * 80, py = 10 + r() * 70; if (Math.hypot((px - 48) / 42, (py - 44) / 36) > 1) continue; E(x, px, py, 2.4, 1.2, ['#5a8a3a', '#6e9c44', '#4a7a32'][(r() * 3) | 0], r() * 3); }
      for (let i = 0; i < 46; i++) { const px = 10 + r() * 76, py = 16 + r() * 66; if (Math.hypot((px - 48) / 40, (py - 46) / 34) > 1) continue; L(x, px, py - 3, px, py, '#6a5a3a', 0.8); E(x, px, py + 1.6, 1.4, 2.2, '#d8a848'); E(x, px - 0.4, py + 1, 0.5, 0.8, '#fff0b8'); }
    });
    addSprite('p22_glassthorn', 72, 70, (x) => {
      const r = seeded(101);
      E(x, 36, 67, 26, 3, 'rgba(0,0,0,0.3)');
      L(x, 34, 68, 30, 40, '#3a3430', 4); L(x, 31, 50, 14, 30, '#3a3430', 2.4); L(x, 32, 46, 56, 28, '#3a3430', 2.4);
      for (let i = 0; i < 46; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()); E(x, 36 + Math.cos(a) * d * 32, 30 + Math.sin(a) * d * 22, 5 + r() * 5, 4 + r() * 4, ['#2e4a32', '#3a5a3a', '#26402a'][(r() * 3) | 0]); }
      for (let i = 0; i < 38; i++) { const px = 8 + r() * 56, py = 12 + r() * 36; E(x, px, py, 1.7, 1.7, ['#9cf0c8', '#d8f8a0', '#b0e8ff'][(r() * 3) | 0]); E(x, px - 0.5, py - 0.5, 0.6, 0.6, '#ffffff'); }
    });
    addSprite('p22_lanternbell', 30, 30, (x) => {
      const r = seeded(103);
      for (let i = 0; i < 6; i++) { const sx = 4 + r() * 22, top = 4 + r() * 10; x.strokeStyle = '#3e6a3a'; x.lineWidth = 1.1; x.beginPath(); x.moveTo(sx, 29); x.quadraticCurveTo(sx - 2, top + 6, sx + 4, top); x.stroke(); for (let k = 0; k < 4; k++) { const bx = sx + 4 - k * 1.6, by = top + 2 + k * 3.6; E(x, bx, by, 1.8, 2.2, '#a8e0ff'); E(x, bx, by + 1.6, 1.6, 0.6, '#e8fbff'); } }
      for (let i = 0; i < 6; i++) E(x, 6 + r() * 18, 26 + r() * 3, 4, 1.4, '#2e5a2e');
    });
    addSprite('p22_whistlegrass', 36, 44, (x) => {
      const r = seeded(107), w = 36, hh = 44;
      for (let i = 0; i < 18; i++) { const sx = w / 2 + (r() - 0.5) * 22, l = 26 + r() * 14, lean = (r() - 0.5) * 10; x.strokeStyle = ['#c8d0c4', '#a8b8b0', '#dce4d8'][i % 3]; x.lineWidth = 1.3; x.beginPath(); x.moveTo(sx, hh - 1); x.quadraticCurveTo(sx + lean * 0.2, hh - l * 0.6, sx + lean, hh - l); x.stroke(); if (r() < 0.5) E(x, sx + lean, hh - l + 4, 0.7, 0.7, '#1a2a2a'); }
    });
    addSprite('p22_echopoppy', 30, 30, (x) => {
      const r = seeded(109);
      for (let i = 0; i < 7; i++) { const sx = 4 + r() * 22, top = 5 + r() * 12; L(x, sx, 29, sx + (r() - 0.5) * 4, top, '#5a7a3a', 1); E(x, sx, top, 3.2, 2.4, '#d42a20'); E(x, sx + 0.8, top - 0.6, 1.4, 1, '#ff6a4a'); E(x, sx, top + 0.4, 0.9, 0.9, '#1a1010'); }
    });
    const glowFrom = (name, test) => { const sp = Engine.sprites[name]; if (!sp) return; const g = new Uint8Array(sp.w * sp.h); for (let i = 0; i < g.length; i++) { const p = sp.data[i]; if ((p >>> 24) > 100 && test(p & 255, (p >> 8) & 255, (p >> 16) & 255)) g[i] = 1; } Engine.setEmissive(name, g); };
    try { glowFrom('p22_lanternbell', (r, g, b) => b > 200 && g > 190); glowFrom('p22_glassthorn', (r, g, b) => g > 200 && (r > 150 || b > 200)); } catch (e) { /* plain */ }
  }

  // undergrowth and flowers, placed by where each would grow: reedmace and cow parsley on the banks, elder, nettles and
  // bracken under the hedges and walls, bracken, thistles and grasses on the slopes, flowers in the meadow drifts.
  // Transient, non-solid, rebuilt the same way every time (a seeded generator); they join js/flora.js's list, so the
  // wind sways them, distance thins them and the Grass switch (Options) takes them away with the rest.
  const LUSH = {
    bank: [['p22_whistlegrass', 0.46, 0.12], ['p22_reedmace', 0.5, 0.2], ['p22_tallgrass1', 0.45, 0.25], ['p22_cowparsley', 0.42, 0.2], ['p22_tallgrass2', 0.4, 0.1], ['p22_tallgrass2', 0.42, 0.2]],
    hedge: [['p22_lanternbell', 0.34, 0.1], ['p22_elder', 0.75, 0.12], ['p22_tallgrass2', 0.42, 0.2], ['p22_tallgrass1', 0.45, 0.25], ['p22_cowparsley', 0.42, 0.18], ['p22_bracken', 0.5, 0.15], ['p22_foxglove', 0.42, 0.1]],
    wall: [['p22_tallgrass1', 0.42, 0.35], ['p22_cowparsley', 0.4, 0.3], ['p22_foxglove', 0.4, 0.15], ['p22_tallgrass2', 0.4, 0.2]],
    slope: [['p22_whistlegrass', 0.44, 0.12], ['p22_echopoppy', 0.3, 0.08], ['p22_bracken', 0.5, 0.25], ['p22_tallgrass2', 0.4, 0.3], ['p22_thistle', 0.36, 0.15], ['p22_tallgrass1', 0.42, 0.15], ['p22_flowers2', 0.3, 0.1]],
    meadow: [['p22_echopoppy', 0.3, 0.15], ['p22_flowers1', 0.3, 0.25], ['p22_flowers2', 0.3, 0.25], ['p22_flowers3', 0.3, 0.25], ['p22_tallgrass1', 0.42, 0.1], ['p22_thistle', 0.34, 0.1]],
    field: [['p22_tallgrass2', 0.38, 0.35], ['p22_flowers1', 0.28, 0.2], ['p22_flowers3', 0.28, 0.2], ['p22_echopoppy', 0.28, 0.1], ['p22_tallgrass1', 0.4, 0.15]],
    wood: [['p22_lanternbell', 0.34, 0.2], ['p22_fern', 0.48, 0.3], ['p22_bracken', 0.52, 0.25], ['p22_foxglove', 0.42, 0.12], ['p22_tallgrass2', 0.4, 0.13], ['p22_tallgrass2', 0.4, 0.15]],
  };
  const LUSH_LABEL = { p22_reedmace: 'Reedmace, the brown heads gone soft.', p22_tallgrass1: 'Tall grass gone to seed.', p22_tallgrass2: 'Long grass, wet at the roots.', p22_cowparsley: 'Cow parsley, white as lace and taller than it looks.', p22_nettle: 'Nettles. They know where the muck is.', p22_elder: 'An elder bush, black with berries.', p22_bracken: 'Bracken, turning gold at the tips.', p22_foxglove: 'Foxgloves.', p22_fern: 'Ferns, curled tight at the tips.', p22_thistle: 'A thistle, its head gone purple.', p22_flowers1: 'Harebells.', p22_flowers2: 'Scabious and clover.', p22_flowers3: 'Wild thyme and a few vetch.', p22_lanternbell: TX.reach.lanternbell, p22_whistlegrass: TX.reach.whistlegrass, p22_echopoppy: TX.reach.echopoppy };
  // classify(m, x, y) -> a zone name or null; budget: how many plants in all
  function addLush(m, classify, budget, seedN) {
    if (!m || m._p22lush) return; m._p22lush = true;
    const r = seeded(seedN), out = [];
    const solids = m.entities.filter((e) => e && e.solid && !e.dead).map((e) => [e.x, e.y, (e.radius || 0.3) + 0.15]);
    const doors = []; for (const k in m.doors) doors.push([(k % m.w) + 0.5, ((k / m.w) | 0) + 0.5]);
    for (let i = 0; i < budget * 4 && out.length < budget; i++) {
      const x = 1.2 + r() * (m.w - 2.4), y = 1.2 + r() * (m.h - 2.4), cx = Math.floor(x), cy = Math.floor(y);
      if (m.isBlocked(cx, cy)) continue;
      const zone = classify(m, cx, cy); if (!zone) continue;
      if (solids.some((s) => Math.hypot(x - s[0], y - s[1]) < s[2]) || doors.some((d) => Math.hypot(x - d[0], y - d[1]) < 1.3)) continue;
      // each zone fills in drifts: a seed plant and a few of its kind round it
      const list = LUSH[zone], pick = () => { let t = r(), k = 0; for (; k < list.length - 1; k++) { t -= list[k][2]; if (t <= 0) break; } return list[k]; };
      const [sprite, sc] = pick(), n = 3 + ((r() * 6) | 0);
      for (let j = 0; j < n && out.length < budget; j++) {
        const px = x + (r() - 0.5) * 2.0, py = y + (r() - 0.5) * 2.0, pcx = Math.floor(px), pcy = Math.floor(py);
        if (pcx < 1 || pcy < 1 || pcx >= m.w - 1 || pcy >= m.h - 1 || m.isBlocked(pcx, pcy) || classify(m, pcx, pcy) !== zone) continue;
        if (solids.some((s) => Math.hypot(px - s[0], py - s[1]) < s[2])) continue;
        out.push({ kind: 'deco', sprite, x: +px.toFixed(2), y: +py.toFixed(2), scale: sc * (0.8 + r() * 0.45), solid: false, nopick: true, transient: true, _flora: sprite === 'p22_reedmace' ? 'reed' : 'grass', _p22lush: true,
          _fp: r() * Math.PI * 2, _fk: 0.8 + r() * 0.5, _fa: 0.6 + r() * 0.6, label: LUSH_LABEL[sprite] || TX.flowers });
      }
    }
    const grassOn = typeof GFX === 'undefined' || GFX.grass !== false;
    if (!m._flora) m._flora = [];
    for (const e of out) { e.hidden = !grassOn; m._flora.push(e); if (grassOn) m.entities.push(e); }
    stats.lush = out.length;
    return out.length;
  }
  function combeZone(m, x, y) {
    const f = m.floorCells ? m.floorCells[y * m.w + x] : 0;
    if (f === 2 || f === 4 || f === 7 || f >= 8) return null;                                  // water, track, yard, the Ram
    if (x >= RAM_X0 - 1 && x <= RAM_X0 + RAM.length && y >= RAM_Y1 - RAM[0].length - 1 && y <= RAM_Y1 + 1) return null;
    if (x > FOLD.x0 - 1 && x < FOLD.x1 + 1 && y > FOLD.y0 - 2 && y < FOLD.y1 + 1) return null;     // the fold is grazed short
    let water = false, wall = false;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const fx = x + dx, fy = y + dy; if (fx < 0 || fy < 0 || fx >= m.w || fy >= m.h) continue; if (m.floorCells[fy * m.w + fx] === 2 && Math.abs(dx) + Math.abs(dy) <= 2) water = true; const c = m.cells[fy * m.w + fx]; if (c && !c.door && Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && (fx > 0 && fy > 0 && fx < m.w - 1 && fy < m.h - 1)) wall = true; }
    if (water) return 'bank';
    if (x <= 2 || y <= 2 || x >= m.w - 3 || y >= m.h - 3) return 'hedge';
    if (wall) return 'wall';
    if (f === 6) return 'meadow';
    if (m.groundAt(x + 0.5, y + 0.5) > 0.7) return 'slope';
    return ((x * 7 + y * 13) % 5 === 0) ? 'meadow' : 'field';
  }

  // townsfolk sprites, tinted for the four new people (the way js/calendar11.js tints its stall-keepers); the townsfolk
  // art arrives after this script runs, so this is called again whenever one of the new maps is built or loaded
  function tinted(src, dst, tint) {
    if (typeof Engine === 'undefined' || !Engine.sprites || Engine.sprites[dst] || !Engine.sprites[src]) return;
    const s = Engine.sprites[src], d = new Uint32Array(s.data.length);
    for (let i = 0; i < d.length; i++) {
      const p = s.data[i], a = p >>> 24; if (!a) { d[i] = p; continue; }
      const c = (v, k) => Math.max(0, Math.min(255, Math.round(v * k)));
      d[i] = ((a << 24) | (c((p >> 16) & 255, tint[2]) << 16) | (c((p >> 8) & 255, tint[1]) << 8) | c(p & 255, tint[0])) >>> 0;
    }
    Engine.addSprite(dst, Object.assign({}, s, { data: d }));
  }
  function paintPeople() {
    tinted('townswoman', 'p22_tamar', [0.95, 0.92, 0.82]);
    tinted('townsman', 'p22_kit', [1.05, 0.95, 0.8]);
    tinted('townsman', 'p22_gideon', [1.08, 0.88, 0.72]);
    tinted('townsman', 'p22_absalom', [0.82, 0.84, 0.88]);
  }

  // textures: grown-over chalk (turf creeping over the figure), flint-and-lime walls, thatch, a flowery meadow
  function paintTextures() {
    if (typeof Engine === 'undefined' || !Engine.addTexture || !Engine.textures) return;
    const T = Engine.textures, mk = (name, src, fn) => {
      if (T[name] || !T[src]) return; const s = T[src], d = new Uint32Array(s.length);
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const p = s[y * 64 + x]; d[y * 64 + x] = fn(p & 255, (p >> 8) & 255, (p >> 16) & 255, x, y) >>> 0; }
      Engine.addTexture(name, d);
    };
    const px = (r, g, b) => (255 << 24) | (Math.max(0, Math.min(255, b | 0)) << 16) | (Math.max(0, Math.min(255, g | 0)) << 8) | Math.max(0, Math.min(255, r | 0));
    const h = (x, y, k) => { let n = (x * 374761393 + y * 668265263 + k * 1442695041) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
    // flint cobbles set in lime: the chalk country's building stone (grey-blue nodules, white mortar, brick quoin rows)
    mk('t_p22_flint', 't_stone', (r, g, b, x, y) => {
      if ((y & 31) >= 29) return px(196 + h(x >> 2, y, 5) * 18, 172 + h(x >> 2, y, 6) * 14, 132);               // a dressed-chalk lacing course
      const cx = Math.floor((x + (((y / 6) | 0) & 1) * 3) / 6), cy = Math.floor(y / 6), fx = ((x + (((y / 6) | 0) & 1) * 3) % 6) - 2.5, fy = (y % 6) - 2.5;
      const rr = 2.0 + h(cx, cy, 9) * 0.8; if (fx * fx + fy * fy > rr * rr) return px(214 + h(x, y, 3) * 16, 208 + h(x, y, 3) * 14, 192 + h(x, y, 3) * 12);
      const f = h(cx, cy, 7), lit = fx + fy < -1 ? 24 : 0; return px(112 + f * 46 + lit, 116 + f * 42 + lit, 124 + f * 42 + lit);
    });
    mk('t_p22_lime', 't_stone', (r, g, b, x, y) => px(210 + (r - 120) * 0.12, 202 + (g - 120) * 0.12, 182 + (b - 120) * 0.12));
    mk('t_p22_thatch', 't_wood', (r, g, b, x, y) => { const s = h(x, y >> 1, 11), band = (y & 15) === 0 ? 0.78 : 1; return px((150 + s * 50) * band, (118 + s * 40) * band, (62 + s * 24) * band); });
    // a meadow: the grass, with flower heads scattered through it
    mk('t_p22_meadow', 't_grass', (r, g, b, x, y) => { const s = h(x, y, 17); if (s > 0.975) return px(120, 130, 220); if (s > 0.955) return px(200, 140, 210); if (s > 0.94) return px(236, 214, 90); return px(r * 1.02, g * 1.04, b * 0.96); });
    // the Chalk Ram's 32 contour tiles (see RAM below): each cell of the figure is one of 16 marching-squares cases, the
    // chalk where the bilinear blend of its four corners passes one half, a cut edge round it, turf outside; the
    // grown-over set lets the turf back over most of the white
    if (!T.t_p22_ram0 && T.t_grass && T.t_p20_chalk) {
      const G0 = T.t_grass, C0 = new Uint32Array(4096);
      for (let i = 0; i < 4096; i++) { const n = h(i & 63, i >> 6, 41), v = 214 + n * 26; C0[i] = px(v + 6, v + 2, v - 12); }
      for (let k = 0; k < 16; k++) for (const over of [0, 1]) {
        const tl = k & 1, tr = (k >> 1) & 1, br = (k >> 2) & 1, bl = (k >> 3) & 1, d = new Uint32Array(4096);
        for (let ty = 0; ty < 64; ty++) for (let tx = 0; tx < 64; tx++) {
          // figure-local: u along the figure (columns run from world +y to -y), v down the slope (world +x)
          const u = 1 - (ty + 0.5) / 64, v = (tx + 0.5) / 64;
          const f = tl * (1 - u) * (1 - v) + tr * u * (1 - v) + bl * (1 - u) * v + br * u * v;
          const gp = G0[ty * 64 + tx], cp = C0[ty * 64 + tx];
          let out;
          if (f > 0.5) {
            const turf = over && h(tx >> 1, ty >> 1, 31 + k) < 0.9;
            if (over && !turf) out = px((gp & 255) * 0.75 + 52, ((gp >> 8) & 255) * 0.75 + 54, ((gp >> 16) & 255) * 0.75 + 34);   // a grey-green ghost of chalk
            else out = turf ? px((gp & 255) * 0.96 + 8, ((gp >> 8) & 255) * 0.98 + 10, ((gp >> 16) & 255) * 0.96 + 4) : px(Math.min(255, (cp & 255) * 1.12 + 14), Math.min(255, ((cp >> 8) & 255) * 1.12 + 14), Math.min(255, ((cp >> 16) & 255) * 1.1 + 12));
          } else if (f > 0.42 && !over) out = px((gp & 255) * 0.55, ((gp >> 8) & 255) * 0.6, ((gp >> 16) & 255) * 0.5);       // the cut edge
          else out = gp | 0xff000000;
          d[ty * 64 + tx] = out >>> 0;
        }
        Engine.addTexture('t_p22_ram' + (over ? 'o' : '') + k, d);
      }
    }
  }

  function installArt() {
    try { paintTextures(); paintSheep(); paintProps(); paintFlora(); paintFantasy(); paintPeople(); } catch (e) { warnOnce('art', e); }
  }

  // ================================================================ items: mutton six ways, apples, the quest items
  const DISH = { salt: 'p22_salt_mutton', broth: 'p22_mutton_broth', chops: 'p22_mutton_chops', pie: 'p22_mutton_pie', hotpot: 'p22_mutton_hotpot', roast: 'p22_roast_mutton' };
  const MUTTON = Object.values(DISH);
  const ITEM_DEFS = {
    p22_salt_mutton: { k: 'salt', hp: 8, fat: 15, value: 3 },
    p22_mutton_broth: { k: 'broth', voice: 12, hp: 6, fat: 15, value: 4 },
    p22_mutton_chops: { k: 'chops', hp: 14, fat: 20, value: 6 },
    p22_mutton_pie: { k: 'pie', hp: 16, fat: 25, value: 7 },
    p22_mutton_hotpot: { k: 'hotpot', hp: 20, voice: 6, fat: 30, value: 9 },
    p22_roast_mutton: { k: 'roast', hp: 30, voice: 10, fat: 40, value: 16 },
    p22_apple: { k: 'apple', hp: 3, fat: 10, value: 1 },
  };
  function installItems() {
    if (typeof ITEMS === 'undefined') return;
    for (const id in ITEM_DEFS) {
      if (ITEMS[id]) continue;
      const d = ITEM_DEFS[id], t = TX.items[d.k];
      ITEMS[id] = { name: t.name, sprite: 'loot', desc: t.desc, use: 'p22_food', hp: d.hp || 0, voice: d.voice || 0, fat: d.fat || 0, eat: t.eat, value: d.value };
    }
    if (!ITEMS.p22_furze) ITEMS.p22_furze = { name: TX.items.furze.name, sprite: 'loot', desc: TX.items.furze.desc, value: 1 };
    if (!ITEMS.p22_tinder) ITEMS.p22_tinder = { name: TX.items.tinder.name, sprite: 'loot', desc: TX.items.tinder.desc, key: true };
    if (!ITEMS.p22_tally) ITEMS.p22_tally = { name: TX.items.tally.name, sprite: 'loot', desc: TX.items.tally.desc, key: true };
    if (!ITEMS.p22_button) ITEMS.p22_button = { name: TX.items.button.name, sprite: 'loot', desc: TX.items.button.desc, valuable: true, value: 12 };
    if (typeof ARMOR !== 'undefined' && !ARMOR.a_p22_mantle) {
      ARMOR.a_p22_mantle = { name: TX.items.mantle.name, slot: 'body', ar: 3, noise: -0.5, value: 48, desc: TX.items.mantle.desc };
      ITEMS.a_p22_mantle = Object.assign({ sprite: 'gear', armor: true }, ARMOR.a_p22_mantle);
    }
    try {
      if (typeof ICONS !== 'undefined' && ICONS && ICONS.TABLE) Object.assign(ICONS.TABLE, {
        p22_salt_mutton: ['pebble', {}], p22_mutton_broth: ['jar', { liq: '#c8a46a' }], p22_mutton_chops: ['pebble', {}],
        p22_mutton_pie: ['pebble', {}], p22_mutton_hotpot: ['jar', { liq: '#a8783a' }], p22_roast_mutton: ['pebble', {}],
        p22_apple: ['pebble', {}], p22_furze: ['herb', { v: 'bark' }], p22_tinder: ['scroll', { paper: '#c8a050', ink: '#6a3a1a' }], p22_tally: ['book', { cov: '#5a6a4a', band: '#a8a8a0', title: '#e0e0d0', ruled: true }],
        p22_button: ['signet', {}], a_p22_mantle: ['body', { v: 'hushcoat', m: '#d8d0b8' }],
      });
    } catch (e) { /* the fallback icons will do */ }
  }
  // hand-built 24x24 pixel icons (js/icons.js's PIX kit: layers on an integer grid, one light, one ink outline)
  function installPixelIcons() {
    if (typeof ICONS === 'undefined' || !ICONS.PIX || !ICONS.C_PX) return;
    const X = ICONS.PIX, C = ICONS.C_PX, put = (id, fn) => { if (!X[id]) X[id] = fn; };
    put('p22_salt_mutton', (d) => { d.layer('#b06a58', { shiny: 1 }).poly([4, 9, 18, 6, 21, 15, 7, 19]); d.layer('#e8e2d4', { sep: false }).path([5, 10, 18, 7]).px(9, 12, 13, 11, 16, 13, 11, 15, 18, 10); d.layer('#7a3a2a').path([7, 18, 20, 15]); });
    put('p22_mutton_broth', (d) => { d.layer(C.clay, { shiny: 1 }).ell(12, 15, 9, 5.5).rect(3, 12, 18, 3); d.layer('#c8a46a', { shade: 'flat', sep: false }).ell(12, 12.5, 7.5, 2); d.mark('#efe0a0', 9, 12, 14, 12).mark('#e8e2d4', 7, 12, 16, 13); d.layer('#d8d0c4', { shade: 'flat' }).px(10, 8, 11, 7, 11, 6, 14, 8, 13, 6); });
    put('p22_mutton_chops', (d) => { d.layer('#a8584a', { shiny: 1 }).ell(9, 14, 5.5, 4.5).ell(16, 12, 5, 4); d.layer('#e8e2d4', { sep: false }).ell(9, 14, 2.4, 1.6).ell(16, 12, 2, 1.4); d.layer(C.bone).rect(19, 5, 2, 6).rect(4, 17, 4, 2); d.mark('#4a2010', 6, 11, 13, 10); });
    put('p22_mutton_pie', (d) => { d.layer('#c88a42', { shiny: 1 }).rect(5, 9, 14, 10).ell(12, 9, 7, 2.6); d.layer('#e8b870', { sep: false }).path([6, 9, 9, 8, 12, 8, 15, 8, 18, 9]); d.layer('#7a4a1c').px(12, 8, 11, 9); d.layer('#9a6428', { shade: 'flat', sep: false }).path([5, 13, 19, 13]); });
    put('p22_mutton_hotpot', (d) => { d.layer(C.clay, { shiny: 1 }).ell(12, 15, 10, 5.5); d.layer('#d8a050', { sep: false }).ell(9, 12.5, 3, 1.8).ell(14, 12, 3, 1.8).ell(12, 14.5, 3, 1.6).ell(17, 14, 2.4, 1.4); d.mark('#f0d090', 8, 12, 13, 11).mark('#6a3a18', 11, 13, 16, 13); });
    put('p22_roast_mutton', (d) => { d.layer('#8a4a24', { shiny: 1 }).thick([5, 16, 9, 12, 14, 10, 17, 9], (t) => 4.4 - t * 2.4); d.layer(C.bone).rect(17, 6, 4, 3); d.layer('#4f7a34').path([7, 9, 9, 6]).path([11, 8, 12, 5]); d.mark('#d8a060', 8, 13, 12, 11); });
    put('p22_apple', (d) => { d.layer('#b8281e', { shiny: 1 }).ell(12, 14, 6.6, 6.2); d.layer(C.dwood).path([12, 8, 13, 5]); d.layer('#4f7a34').poly([13, 6, 17, 4, 16, 7]); d.mark('#ffd0c0', 9, 11, 9, 12); });
    put('p22_furze', (d) => { d.layer('#6a5a2c').thick([3, 18, 12, 14, 21, 10], () => 2.4); d.layer(C.straw).rect(10, 11, 2, 7); d.layer('#e8c840', { shiny: 1 }).px(5, 15, 8, 13, 14, 12, 17, 11, 19, 9, 7, 17); d.layer('#4a5a24', { shade: 'flat' }).path([4, 15, 10, 13]).path([14, 11, 20, 8]); });
    put('p22_tinder', (d) => { d.layer(C.brass, { shiny: 1 }).rect(5, 8, 14, 10); d.layer('#8a6a2a').rect(5, 11, 14, 1); d.layer(C.steel).rect(16, 5, 3, 3); d.mark('#fff0b0', 7, 9, 8, 9).mark('#3a2a10', 12, 14); });
    put('p22_tally', (d) => { d.layer('#5a6a4a', { shiny: 1 }).rect(5, 4, 14, 17); d.layer('#e0e0d0', { sep: false }).rect(7, 6, 10, 2); d.layer('#2a3020', { shade: 'flat', sep: false }).path([7, 11, 16, 11]).path([7, 13, 14, 13]).path([7, 15, 16, 15]); d.mark('#a8a8a0', 18, 5); });
    put('p22_button', (d) => { d.layer('#c8b890', { shiny: 1 }).ell(12, 12, 7, 7); d.layer('#8a7a58', { sep: false }).ell(12, 12, 4.4, 4.4); d.layer('#3a2a18').px(10, 11, 14, 11, 10, 13, 14, 13); d.mark('#f0e8d0', 9, 8); });
    put('a_p22_mantle', (d) => { d.layer('#d8d0b8', { shiny: 1 }).poly([8, 3, 16, 3, 20, 21, 4, 21]); d.layer('#b8ae94', { sep: false }).path([12, 4, 12, 20]).path([8, 6, 16, 6]); d.layer('#8a8070').rect(10, 3, 4, 2); d.mark('#f4eedc', 9, 8, 7, 14); });
  }
  function eat(slot) {
    const it = ITEMS[slot.id], p = G.player; if (!it || !p) return;
    if (it.hp) p.hp = Math.min(p.hpMax, p.hp + it.hp);
    if (it.voice) p.voice = Math.min(p.voiceMax, p.voice + it.voice);
    if (it.fat) p.fat = Math.min(p.fatMax, p.fat + it.fat);
    try { if (typeof needsOn === 'function' && needsOn()) p.hunger = Math.min(100, Math.max(0, (Number(p.hunger) || 0) + (slot.id === 'p22_apple' ? 15 : slot.id === 'p22_salt_mutton' || slot.id === 'p22_mutton_broth' ? 30 : 45))); } catch (e) { /* no needs */ }
    G.take(slot.id); msg(it.eat, 'good', 3500);
    try { if (typeof Audio_ !== 'undefined' && Audio_.sfx && Audio_.sfx.pickup) Audio_.sfx.pickup(); } catch (e) { /* silent */ }
    try { renderInventory(); } catch (e) { /* the panel may be closed */ }
  }

  // ---------------------------------------------------------------- mutton at every inn and food-seller
  // Each list is appended to (never replaced), once, and only with what that seller would plausibly stock.
  const MENUS = {
    // Oakhaven ate its flocks in the two shut years (R2): the Boar has only salt mutton, dear, off Vane's boat;
    // the fresh dishes are Wethercombe's, where Tamar's new flock is, and the Coast's
    hetty: [DISH.salt],
    vane: [DISH.salt, DISH.broth],                                                  // ship's stores (shared with vane_wg)
    vane_wg: [DISH.salt, DISH.broth],
    p17c_sloe: [DISH.salt, DISH.broth],                                             // a chandler provisions boats
    p22_gideon: [DISH.salt, DISH.broth, DISH.chops, DISH.pie, DISH.hotpot, DISH.roast, 'p12_cider', 'p22_apple', 'p22_furze'],
    p22_tamar: [DISH.salt, DISH.chops, 'p22_furze'],
  };
  // the market provisioner's rotating board (js/calendar11.js VENDORS 'larder'): three dishes join its pool
  const LARDER_ADD = [DISH.salt];
  function installMenus() {
    if (typeof NPCS === 'undefined' || typeof ITEMS === 'undefined') return;
    for (const id in MENUS) {
      const n = NPCS[id]; if (!n) continue;
      if (!Array.isArray(n.shop)) n.shop = [];
      for (const item of MENUS[id]) if (ITEMS[item] && !n.shop.some((s) => s && s.item === item)) n.shop.push({ item });
      if (!n.shopTalk && id === 'hetty') n.shopTalk = { hello: TX.hetty.hello, broke: TX.hetty.broke, thanks: TX.hetty.thanks.slice(), buys: ['consumable'] };
      if (n.shopTalk && n.shopTalk.buys && !n.shopTalk.buys.includes('consumable') && (id === 'hetty' || id === 'p22_gideon')) n.shopTalk.buys.push('consumable');
    }
    try {
      if (typeof CALENDAR11 !== 'undefined' && CALENDAR11.VENDORS) { const v = CALENDAR11.VENDORS.find((q) => q && q.key === 'larder'); if (v && Array.isArray(v.pool)) for (const d of LARDER_ADD) if (!v.pool.includes(d)) v.pool.push(d); }
    } catch (e) { warnOnce('larder', e); }
  }

  // ================================================================ people
  const NPC_DEFS = {
    p22_tamar: { name: TX.tamar.name, sprite: 'p22_tamar', portrait: 'townswoman', tier: 'low', markup: 0.95,
      greet: { polite: TX.tamar.polite, normal: TX.tamar.normal, blunt: TX.tamar.blunt },
      topics: { 'The Hedge': TX.tamar.hedge, 'Oakhaven': TX.tamar.combe },
      shopTalk: { hello: TX.tamar.hello, broke: TX.tamar.broke, thanks: TX.tamar.thanksShop.slice(), buys: ['consumable'] },
      quest: (g) => tamarQuest(g) },
    p22_kit: { name: TX.kit.name, sprite: 'p22_kit', portrait: 'pim', tier: 'low', scale: 0.74,
      greet: { polite: TX.kit.polite, normal: TX.kit.normal, blunt: TX.kit.blunt }, topics: {}, quest: (g) => kitQuest(g) },
    p22_gideon: { name: TX.gideon.name, sprite: 'p22_gideon', portrait: 'townsman', tier: 'low', markup: 1.0,
      greet: { polite: TX.gideon.polite, normal: TX.gideon.normal, blunt: TX.gideon.blunt }, topics: { 'Oakhaven': TX.gideon.topic },
      shopTalk: { hello: TX.gideon.hello, broke: TX.gideon.broke, thanks: TX.gideon.thanks.slice(), buys: ['consumable', 'valuable'] }, quest: () => null },
    p22_absalom: { name: TX.absalom.name, sprite: 'p22_absalom', portrait: 'harrow', tier: 'low',
      greet: { polite: TX.absalom.polite, normal: TX.absalom.normal, blunt: TX.absalom.blunt }, topics: { 'The Hedge': TX.absalom.topic }, quest: (g) => absalomQuest(g) },
  };
  function installPeople() {
    if (typeof NPCS === 'undefined') return;
    for (const id in NPC_DEFS) if (!NPCS[id]) NPCS[id] = NPC_DEFS[id];
    // their voices (js/voices.js): pitch, throat, style, from who they are
    try {
      if (typeof VOICES !== 'undefined' && VOICES.PEOPLE) Object.assign(VOICES.PEOPLE, Object.assign({
        p22_tamar: { f0: 188, fs: 1.03, style: 'human' },     // a shepherd in her forties, hoarse from the hill
        p22_kit: { f0: 268, fs: 1.24, style: 'human' },       // a boy of nine
        p22_gideon: { f0: 116, fs: 0.93, style: 'human' },    // a big innkeeper, slow
        p22_absalom: { f0: 96, fs: 0.9, style: 'human' },     // eighty, and a pipe
        p22_kitlost: { f0: 274, fs: 1.24, style: 'human' },   // Kit, frightened
      }, VOICES.PEOPLE));
    } catch (e) { /* default voices */ }
  }

  // ---------------------------------------------------------------- quest state
  const EWES = 5, STAKES = 6, FIRES = 3;
  const found = (i) => flag('f' + i) === 1, home = (i) => flag('h' + i) === 1;
  const homeCount = () => { let n = 0; for (let i = 0; i < EWES; i++) if (home(i)) n++; return n; };
  const scoured = (i) => flag('s' + i) === 1;
  const scourCount = () => { let n = 0; for (let i = 0; i < STAKES; i++) if (scoured(i)) n++; return n; };
  const lit = (i) => flag('b' + i) === 1;
  const litCount = () => { let n = 0; for (let i = 0; i < FIRES; i++) if (lit(i)) n++; return n; };
  const flockStage = () => flag('flock', 2), ramStage = () => flag('ram', 2), fireStage = () => flag('fires', 2);
  const silenced = () => flag('hum') === 1;
  const following = (i) => flockStage() >= 1 && found(i) && !home(i);

  // Leaving the Reach (the Greening, the escape or Part Three) closes any of the three that is begun and unfinished, once (R1).
  const leftReach = () => hasG() && !!(G.flags.greening || G.flags.escaped || G.flags.part3 || G.flags.part4);
  function closeAtLeaving() {
    if (!leftReach()) return;
    for (const [k, line] of [['flock', TX.journal.flockClosed], ['ram', TX.journal.ramClosed], ['fires', TX.journal.firesClosed]]) {
      if (flag(k, 2) !== 1 || flag(k + '_closed')) continue;
      setFlag(k + '_closed', 1); journal('side', line);
    }
  }
  function tamarQuest(g) {
    const n = homeCount(), st = flockStage();
    if (!flag('truth')) { setFlag('truth', 1); journal('side', TX.journal.truth); }
    if (st === 0) { setFlag('flock', 1, 2); journal('side', TX.journal.flock); return { text: TX.tamar.intro + ' ' + TX.tamar.hedge, journal: null }; }
    if (st === 1 && n < EWES) return { text: fmt(TX.tamar.progress, n), journal: null };
    if (st === 1 && n >= EWES) {
      setFlag('flock', 2, 2);
      try { if (!G.player.inv.some((s) => s && s.id === 'a_p22_mantle')) G.give('a_p22_mantle'); G.give(DISH.salt, 2); G.give(DISH.chops, 1); G.player.gold += 30; } catch (e) { warnOnce('reward', e); }
      syncSheep();
      return { text: TX.tamar.thanks + ' ' + TX.tamar.reward, journal: ['side', TX.journal.flockDone] };
    }
    return { text: TX.tamar.after, journal: null };
  }
  function kitQuest(g) {
    const n = scourCount(), st = ramStage();
    if (st === 0) { setFlag('ram', 1, 2); return { text: TX.kit.intro, journal: ['side', TX.journal.ram] }; }
    if (st === 1 && n < STAKES) {
      let last = -1; for (let i = 0; i < STAKES; i++) if (scoured(i)) last = i;
      return { text: n ? fmt(TX.kit.progress, n, TX.kit.parts[Math.max(0, last)]) : TX.kit.intro, journal: null };
    }
    if (st === 1 && n >= STAKES) { setFlag('ram', 2, 2); try { G.give('p22_button'); } catch (e) { /* none */ } return { text: TX.kit.done, journal: ['side', TX.journal.ramDone] }; }
    return { text: TX.kit.after, journal: null };
  }
  function absalomQuest(g) {
    const n = litCount(), st = fireStage();
    if (st === 0) {
      setFlag('fires', 1, 2);
      try { if (!G.has('p22_tinder')) G.give('p22_tinder'); if (!G.has('p22_furze')) G.give('p22_furze', 1); } catch (e) { /* none */ }
      return { text: TX.absalom.intro, journal: ['side', TX.journal.fires] };
    }
    if (st === 1 && n < FIRES) return { text: fmt(TX.absalom.progress, n), journal: null };
    if (st === 1 && n >= FIRES) { setFlag('fires', 2, 2); try { G.player.gold += 25; } catch (e) { /* none */ } return { text: TX.absalom.done, journal: ['side', TX.journal.firesDone] }; }
    return { text: TX.absalom.after, journal: null };
  }

  // ================================================================ the Chalk Ram (a figure cut in the west slope)
  // A grid of CORNERS (X = chalk), rows running down the slope (west to east), columns along it (seen from the valley,
  // facing west, left is south). Each cell between four corners is drawn with one of 16 contour tiles (t_p22_ram0..15,
  // grown over: t_p22_ramo0..15), so the figure has smooth edges at no more cost than 32 textures.
  const RAM = [
    '.......................',
    '...XXXXX...............',
    '..XXXXXXXX.............',
    '.XXX....XXX............',
    '.XX..XX..XX............',
    '.XX.XXXX.XX..XXXXXXX...',
    '.XX.XXX..XX.XXXXXXXXXX.',
    '..XX....XX.XXX......XXX',
    '...XXXXXX.XXX........XX',
    '..XXXXXXXXXX.........XX',
    '.XXXXXXXXXXX........XXX',
    'XXXXX..XXXXXX......XXX.',
    '.XX.....XXXXXXXXXXXXX..',
    '........XX.XX....XX.XX.',
    '........XX.XX....XX.XX.',
    '.......XX..XX...XX..XX.',
    '.......................',
  ];
  const RAM_X0 = 5, RAM_Y1 = 31;                              // cell (row r, column c) is world cell (RAM_X0 + r, RAM_Y1 - c)
  const RAM_PARTS = [[0, 3], [4, 7], [8, 11], [12, 15], [16, 18], [19, 21]];   // cell columns: nose, horn, chest, back, haunch, tail
  const corner = (r, c) => (RAM[r] && RAM[r][c] === 'X') ? 1 : 0;
  // every cell the figure touches: [x, y, column, case]
  const ramCells = () => {
    const out = [];
    for (let r = 0; r + 1 < RAM.length; r++) for (let c = 0; c + 1 < RAM[0].length; c++) {
      const k = corner(r, c) | (corner(r, c + 1) << 1) | (corner(r + 1, c + 1) << 2) | (corner(r + 1, c) << 3);
      if (k) out.push([RAM_X0 + r, RAM_Y1 - c, c, k]);
    }
    return out;
  };
  const partOf = (c) => Math.max(0, RAM_PARTS.findIndex(([a, b]) => c >= a && c <= b));
  const STAKE_AT = RAM_PARTS.map(([a, b]) => [RAM_X0 + RAM.length - 0.4, RAM_Y1 - Math.round((a + b) / 2) + 0.5]);   // along the foot of the figure
  const RAM_I = 8, RAM_O = 24;                                // floor indices of the two tile sets in Wethercombe's list
  function syncRam(m) {
    if (!m || !m.floorCells) return;
    let changed = false;
    for (const [x, y, c, k] of ramCells()) { const want = (scoured(partOf(c)) ? RAM_I : RAM_O) + k, i = y * m.w + x; if (m.floorCells[i] !== want) { m.floorCells[i] = want; changed = true; } }
    if (changed) try { if (typeof R3D !== 'undefined' && R3D.invalidate) R3D.invalidate(); } catch (e) { /* CPU frames read floorCells directly */ }
  }

  // ================================================================ Wethercombe
  const BEACONS = [
    { map: DOWNS, x: 17.5, y: 12.9, name: 'Long Down' },       // the Downs' own cairn (js/horizon20.js) is the first fire
    { map: COMBE, x: 54.5, y: 17.5, name: 'Hob\'s Knap' },
    { map: COMBE, x: 6.5, y: 45.5, name: 'Ewe Barrow' },
  ];
  // where each stray waits: two on the Downs, three in the combe
  const STRAYS = [
    { map: DOWNS, x: 9.6, y: 35.2 },        // by the dew-pond
    { map: DOWNS, x: 30.5, y: 18.6 },       // under the Scar
    { map: COMBE, x: 16.5, y: 38.5 },       // below the Chalk Ram
    { map: COMBE, x: 51.5, y: 34.5 },       // the orchard's far corner
    { map: COMBE, x: 43.5, y: 53.2 },       // under the pylon
  ];
  const TREES = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) TREES.push([41.5 + c * 3.2 + (r % 2) * 1.5, 24.5 + r * 3.1]);
  const COMBE_FLOORS = ['t_grass', 't_moss', 't_water', 't_p20_chalk', 't_p20_track', 't_shallows', 't_p22_meadow', 't_cobble']
    .concat(Array.from({ length: 16 }, (_, k) => 't_p22_ram' + k), Array.from({ length: 16 }, (_, k) => 't_p22_ramo' + k));

  function buildCombe() {
    const m = new GameMap(COMBE, TX.combe, CW, CH, {
      outdoor: true, floor: 't_grass', floorTextures: COMBE_FLOORS, fogDist: 40, fogColor: [72, 76, 66],
      music: 'wild', danger: 1, spawn: { x: STILE[0] + 0.5, y: 1.6, dir: Math.PI / 2 },
    });
    const MOSS = 1, WATER = 2, TRACK = 4, SHALLOW = 5, MEADOW = 6, COBBLE = 7;
    m.border('t_hedge');
    m.set(STILE[0], 0, DOOR({ tex: 't_p20_gate', portal: { map: DOWNS, x: STILE_DOWNS[0] + 0.5, y: STILE_DOWNS[1] - 1.4, dir: -Math.PI / 2 }, label: TX.stileOut }));
    // the land: the west ridge (the Ram on its east face), the east ridge with Hob's Knap, Ewe Barrow in the south-west,
    // Pylon Hill in the south-east, a shoulder under the north hedge; the valley floor between them stays low
    m.hill(-2, 21, 23, 33, 8.0, { steep: 0.72 });     // the west scarp: a down with a flat top and a long steep east face
    m.hill(57, 19, 9, 15, 2.6);
    m.hill(54.5, 17.5, 3.6, 3.2, 3.0);
    m.hill(7, 46, 7.5, 7, 2.9);
    m.hill(48.5, 50.5, 10, 8, 2.2);
    m.hill(11, 3, 7, 4, 1.4);
    m.hill(46, 4, 9, 4, 1.2);
    m.ramp(8, 45, 16, 46, 2.8, 0, 'x');   // the drove-path up the barrow's east flank to its beacon (the mound sits on the scarp's foot)
    const inRam = (x, y) => x >= RAM_X0 - 1 && x <= RAM_X0 + RAM.length && y >= RAM_Y1 - RAM[0].length - 1 && y <= RAM_Y1 + 1;
    // meadow patches on the slopes (a flat colour at a distance would band, so only small drifts)
    const mr = seeded(77);
    for (let i = 0; i < 26; i++) { const cx = 2 + mr() * (CW - 4), cy = 2 + mr() * (CH - 4), rr = 1 + mr() * 1.6; for (let y = Math.floor(cy - rr); y <= cy + rr; y++) for (let x = Math.floor(cx - rr); x <= cx + rr; x++) if (x > 0 && y > 0 && x < CW - 1 && y < CH - 1 && Math.hypot(x + 0.5 - cx, y + 0.5 - cy) < rr && !inRam(x, y) && m.groundAt(x + 0.5, y + 0.5) > 0.3) m.setFloor(x, y, MEADOW); }
    // the drove-road: down from the stile, past the inn and the farm, beside the fold, on south to the pylon
    const track = (pts, idx) => { for (let i = 0; i + 1 < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 2; for (let k = 0; k <= n; k++) { const x = ax + (bx - ax) * k / n, y = ay + (by - ay) * k / n; m.setFloor(Math.floor(x), Math.floor(y), idx); } } };
    track([[STILE[0], 1], [33, 5], [32, 8], [34, 13], [35, 19], [34, 22], [33, 26], [33, 29], [38, 30], [39, 38], [41, 44], [45, 48]], TRACK);
    track([[16, 45.5], [8, 45.5]], TRACK);
    track([[33, 8], [42, 8]], TRACK); track([[30, 24], [26, 25], [22.5, 25]], TRACK);
    for (let y = 21; y <= 23; y++) for (let x = 27; x <= 33; x++) m.setFloor(x, y, COBBLE);          // the inn yard
    // the Wether brook: out of the spring under the north shoulder, along the foot of the scarp, out under the south hedge
    const brook = [[23, 4], [24, 9], [24, 14], [24, 19], [24, 25], [25, 31], [25, 38], [26, 44], [27, 50], [28, 58]];
    for (let i = 0; i + 1 < brook.length; i++) {
      const [ax, ay] = brook[i], [bx, by] = brook[i + 1], n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 3;
      for (let k = 0; k <= n; k++) { const x = Math.floor(ax + (bx - ax) * k / n), y = Math.floor(ay + (by - ay) * k / n); m.setFloor(x, y, WATER); if (m.floorCells[y * m.w + x + 1] !== WATER) m.setFloor(x + 1, y, MOSS); }
    }
    for (let y = 3; y <= 5; y++) for (let x = 22; x <= 24; x++) m.setFloor(x, y, WATER);           // the spring pool
    // fords: stepping stones in the shallows where the paths cross
    for (const [x, y] of [[24, 25], [25, 25], [25, 38], [26, 38]]) m.setFloor(x, y, SHALLOW);
    // buildings: walls to the eaves, then a thatched roof stepping up to a ridge along the long side (the engine's
    // blocks are flat-topped, so a roof is rows of blocks, each a little higher, thatch on their faces and tops)
    const building = (x0, y0, x1, y1, wall, eave, door, label, portal) => {
      const alongX = (x1 - x0) >= (y1 - y0), half = ((alongX ? y1 - y0 : x1 - x0) + 1) / 2;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const edge = x === x0 || x === x1 || y === y0 || y === y1;
        const inward = alongX ? Math.min(y - y0, y1 - y) : Math.min(x - x0, x1 - x);
        const gz = m.groundAt(x + 0.5, y + 0.5), gable = alongX ? (x === x0 || x === x1) : (y === y0 || y === y1);
        const top = gz + eave + (gable ? 0.42 * Math.min(inward, half - 0.5) : 0.42 * Math.min(inward + 1, half + 0.5) - (edge ? 0.42 : 0));
        m.block(x, y, edge ? wall : 't_p22_thatch', top, { capTex: 't_p22_thatch' });
      }
      const [dx, dy] = door;
      m.set(dx, dy, DOOR(Object.assign({ tex: 't_door', label }, portal ? { portal } : { locked: '__never', lockMsg: label })));
    };
    // the Bellwether (door south, to the yard); the Farrants' farmhouse (door north), the barn (door west), a shut cottage
    building(27, 15, 33, 20, 't_house', 1.2, INN_DOOR, TX.innDoor, { map: INN, x: 6.5, y: 8.4, dir: -Math.PI / 2 });
    building(35, 23, 39, 27, 't_p22_flint', 1.1, [37, 23], TX.farmDoor);
    building(43, 6, 49, 11, 't_wood', 1.3, [43, 8], TX.barnDoor);
    building(37, 3, 40, 6, 't_p22_flint', 1.0, [37, 5], TX.cotDoor);
    // dry-stone: the fold (gate gap north, a hurdle beside it), and the orchard's walls, each with a gap
    const low = (x, y, k) => m.block(x, y, 't_stone', m.groundAt(x + 0.5, y + 0.5) + (k || 0.42), { capTex: 't_stone' });
    for (let x = FOLD.x0; x <= FOLD.x1; x++) { if (!FOLD.gate.includes(x)) low(x, FOLD.y0, 0.3); low(x, FOLD.y1, 0.3); }
    for (let y = FOLD.y0 + 1; y < FOLD.y1; y++) { low(FOLD.x0, y, 0.3); low(FOLD.x1, y, 0.3); }
    for (let x = 40; x <= 56; x++) if (x !== 46 && x !== 47) low(x, 39);
    for (let y = 22; y <= 38; y++) if (y !== 29 && y !== 30) low(40, y);
    // things to look at and use
    m.deco('sign', STILE[0] + 1.6, 2.2, { radius: 0.2, scale: 0.85, label: TX.sign });
    m.deco('p22_innsign', 34.6, 21.4, { radius: 0.2, scale: 1.1, label: TX.innSign });
    m.deco('p9p_well', 31.5, 27.5, { radius: 0.45, scale: 0.75, label: TX.well });
    for (const [x, y] of [[36.0, 28.8], [36.8, 28.8], [37.6, 29.0]]) m.deco('p9_skep', x, y, { radius: 0.25, scale: 0.42, label: TX.skep });
    for (const [x, y] of [[51.2, 7.4], [51.6, 10.2], [50.2, 12.8]]) m.deco('p12_stook', x, y, { radius: 0.5, scale: 1.0, label: TX.hay });
    m.deco('p_cart', 46.0, 13.2, { radius: 0.5, scale: 0.9, label: TX.cart });
    m.deco('p22_furze', 42.0, 11.6, { radius: 0.45, scale: 0.8, use: 'p22_furze', label: TX.woodpile });
    m.deco('p17c_bench', 52.6, 18.9, { radius: 0.4, scale: 0.8, label: TX.bench });
    m.deco('p22_trough', 33.5, 36.2, { radius: 0.3, scale: 0.7, label: TX.brook });
    m.deco('p22_hurdle', 36.7, 31.4, { radius: 0.3, scale: 0.8, label: TX.wallStile });
    m.deco('p22_hut', 12.5, 40.5, { radius: 0.6, scale: 1.0, label: TX.hut });
    m.deco('p22_sarsen', 6.6, 50.4, { radius: 0.5, scale: 0.9, label: TX.barrow });
    m.deco('p22_tent', 42.6, 48.8, { radius: 0.7, scale: 1.0, label: TX.tent });
    m.deco('sign', 25.6, 6.4, { radius: 0.2, scale: 0.7, label: TX.spring });
    // the orchard: four rows of four, lanterns on stakes between the rows; lanterns at the inn door
    TREES.forEach(([x, y], i) => m.deco(i % 3 === 1 ? 'p22_apple2' : 'p22_apple', x, y, { radius: 0.4, scale: 1.35, use: 'p22_tree', tree: i, label: TX.tree }));
    for (const [x, y] of [[43.2, 26.1], [49.6, 26.1], [46.4, 29.2], [43.2, 32.3], [49.6, 32.3]]) m.deco('p12_stake_lantern', x, y, { radius: 0.12, scale: 0.6, lightCol: [70, 46, 14], label: TX.lantern });
    for (const x of [28.4, 31.6]) m.deco('p12_stake_lantern', x, 21.3, { radius: 0.12, scale: 0.6, lightCol: [78, 50, 16], label: TX.lantern });
    // the beacons (two here; the Long Down's is the Downs' cairn)
    for (const b of BEACONS.slice(1)) m.deco('p22_beacon', b.x, b.y, { radius: 0.5, scale: 1.1, use: 'p22_beacon', beacon: BEACONS.indexOf(b), label: TX.cairnHint });
    // the Ram's six stakes, along the foot of the figure
    STAKE_AT.forEach(([x, y], i) => m.deco('p22_stake', x, y, { radius: 0.15, scale: 0.6, solid: false, use: 'p22_scour', stake: i, label: TX.ramHint }));
    // the pylon, the hounds that den under it
    m.deco('p22_pylon', PYLON[0], PYLON[1], { radius: 0.9, scale: 9.5, use: 'p22_pylon', label: TX.pylonHum });
    for (const [x, y] of [[45.5, 52.5], [51.6, 47.8], [50.5, 55.0]]) m.enemy('hound', x, y);
    // hawthorns on the ridges, oaks along the north hedge, willows by the brook
    const THORN = [[2, 4], [9, 4], [3, 13], [4, 36], [14, 44], [2, 54], [12, 54], [54, 4], [57, 30], [55, 40], [58, 47], [40, 57], [33, 56], [19, 55], [17, 3], [28, 7], [22, 36], [21, 6]];
    THORN.forEach(([x, y], i) => m.deco('p20_thorn', x + 0.5, y + 0.5, { radius: 0.3, scale: 0.9 + ((i * 37) % 5) * 0.08, label: 'A hawthorn, combed flat by the wind.' }));
    for (const [x, y] of [[3.5, 2.6], [8.5, 2.4], [27.5, 2.8], [41.5, 2.6], [52.5, 2.5], [57.2, 4.5], [57.5, 12.0], [2.6, 44.5]]) m.deco('oak', x, y, { radius: 0.45, scale: 1.7 });
    for (const [x, y] of [[26.2, 12.5], [23.2, 33.5], [28.6, 46.0]]) m.deco('willow', x, y, { radius: 0.4, scale: 1.25 });
    // the people: Tamar at the fold gate, Kit on the fold wall watching the hill
    m.npc('p22_tamar', 32.6, 30.8, { facing: 0 });
    m.npc('p22_kit', 30.2, 33.5, { facing: Math.PI });
    // something worth finding: a shard at the spring, a tonic in the hut, the surveyor's signet, bolts by the barrow
    m.item('shard', 21.6, 4.4);
    m.item('tonic', 12.9, 41.6);
    m.item('v_signet', 43.8, 50.0);
    m.item('bolts', 7.8, 51.2);
    // trees, by where each grows: a beech hanger along the scarp's top and the north hedge, ash and willow by the brook,
    // yews round the barrow, hawthorns in haw on the slopes, elder by the walls (deterministic, solid like any tree)
    const tr = seeded(4401), taken = m.entities.filter((e) => e.solid || e.use || e.kind !== 'deco').map((e) => [e.x, e.y]);
    const okTree = (x, y, gap) => {
      const cx = Math.floor(x), cy = Math.floor(y);
      if (cx < 1 || cy < 1 || cx >= CW - 1 || cy >= CH - 1 || m.get(cx, cy)) return false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const f = m.floorCells[(cy + dy) * m.w + cx + dx]; if (f === WATER || f === TRACK || f === COBBLE || f >= 8 || m.doors[(cy + dy) * m.w + cx + dx]) return false; }
      if (inRam(cx, cy) || (cx >= 39 && cx <= 57 && cy >= 21 && cy <= 39) || (cx >= FOLD.x0 - 2 && cx <= FOLD.x1 + 2 && cy >= FOLD.y0 - 3 && cy <= FOLD.y1 + 1)) return false;
      if (cx >= 24 && cx <= 36 && cy >= 13 && cy <= 30) return false;                              // the inn, its yard, the farm
      if (Math.hypot(x - PYLON[0], y - PYLON[1]) < 4.5 || Math.hypot(x - STILE[0], y) < 3) return false;
      if (m.entities.some((e) => (e.use || e.kind === 'item' || e.kind === 'npc') && Math.hypot(x - e.x, y - e.y) < 2.8)) return false;   // keep what you use clear
      return !taken.some(([tx, ty]) => Math.hypot(x - tx, y - ty) < gap);
    };
    const plant = (sprite, x, y, scale, label, gap) => { if (!okTree(x, y, gap || 1.6)) return false; m.deco(sprite, +x.toFixed(2), +y.toFixed(2), { radius: 0.42, scale, label }); taken.push([x, y]); stats.trees++; return true; };
    stats.trees = 0;
    for (let i = 0; i < 70; i++) { const y = 2 + tr() * 50, x = 1.4 + tr() * 4.2; plant(tr() < 0.75 ? 'p22_beech' : 'p22_ash', x, y, 1.5 + tr() * 0.6, TX.trees.beech, 1.9); }
    for (let i = 0; i < 40; i++) { const x = 3 + tr() * 54, y = 1.4 + tr() * 2.4; plant(tr() < 0.6 ? 'p22_beech' : 'p22_ash', x, y, 1.4 + tr() * 0.6, TX.trees.beech, 2.2); }
    for (let i = 0; i < 60; i++) { const k = (tr() * 9) | 0, [ax, ay] = brook[k], [bx, by] = brook[k + 1], t = tr(), side = tr() < 0.5 ? -1 : 1; plant(tr() < 0.6 ? 'p22_ash' : 'willow', ax + (bx - ax) * t + side * (2 + tr()), ay + (by - ay) * t, 1.2 + tr() * 0.4, TX.trees.ash, 2.6); }
    for (let i = 0; i < 16; i++) { const a = tr() * Math.PI * 2, d = 3 + tr() * 4; plant('p22_yew', 7 + Math.cos(a) * d, 47 + Math.sin(a) * d, 1.2 + tr() * 0.4, TX.trees.yew, 2.0); }
    for (let i = 0; i < 40; i++) { const x = 2 + tr() * 56, y = 2 + tr() * 56; if (m.groundAt(x, y) < 0.6) continue; const g = tr() < 0.3; plant(g ? 'p22_glassthorn' : 'p22_haw', x, y, 1.0 + tr() * 0.4, g ? TX.reach.glassthorn : TX.trees.haw, 3.0); }
    for (let i = 0; i < 24; i++) { const x = 2 + tr() * 56, y = 2 + tr() * 56; plant('p22_bellash', x, y, 1.5 + tr() * 0.4, TX.reach.bellash, 4.0); }
    for (let i = 0; i < 40; i++) { const x = 40 + tr() * 18, y = 40 + tr() * 18; plant(tr() < 0.5 ? 'p22_haw' : 'p22_elder', x, y, 0.9 + tr() * 0.3, TX.trees.haw, 2.4); }
    // no tree may shut a pocket of ground away: walk the map as the reach checks do and fell whatever closes one off
    if (typeof HORIZON20 !== 'undefined' && HORIZON20.reach) for (let pass = 0; pass < 8; pass++) {
      const rc = HORIZON20.reach(m, STILE[0], 1, STILE[0], 1); if (!rc.stuck) break;
      for (const [sx, sy] of rc.stuckCells) {
        let bi = -1, bd = 1e9; m.entities.forEach((e, i) => { if (!/^p22_(beech|ash|yew|haw|elder|bellash|glassthorn)$|^willow$/.test(e.sprite || '')) return; const d = Math.hypot(e.x - sx - 0.5, e.y - sy - 0.5); if (d < bd) { bd = d; bi = i; } });
        if (bi >= 0 && bd < 3) { m.entities.splice(bi, 1); stats.trees--; }
      }
    }
    syncRam(m);
    m.baseCount = m.entities.length;
    m._p22 = true;
    return m;
  }

  function buildInn() {
    const m = new GameMap(INN, TX.inn, 14, 11, { floor: 't_wood', ceil: 't_wood', fogDist: 18, ambient: 0.3, fogColor: [0, 0, 0], music: 'inside', spawn: { x: 6.5, y: 8.4, dir: -Math.PI / 2 } });
    m.border('t_p22_lime');
    m.set(6, 10, DOOR({ portal: { map: COMBE, x: INN_DOOR[0] + 0.5, y: INN_DOOR[1] + 1.5, dir: Math.PI / 2 }, label: TX.innOut }));
    m.rect(1, 2, 4, 2, 't_wood');                                                            // the bar
    m.deco('hearth', 12.9, 4.5, { radius: 0.3, scale: 0.9, glow: 0.7 });
    m.deco('shelf', 1.4, 4.8, { radius: 0.2, scale: 0.9 }); m.deco('shelf', 1.4, 6.6, { radius: 0.2, scale: 0.9 });
    m.deco('table', 7.5, 4.0, { radius: 0.5, scale: 0.7 }); m.deco('table', 9.5, 7.5, { radius: 0.5, scale: 0.7 }); m.deco('table', 4.0, 7.5, { radius: 0.5, scale: 0.7 });
    m.deco('lamp', 6.5, 6.0, { radius: 0.12, scale: 0.7, glow: 0.6 });
    m.deco('p_barrel', 5.6, 1.5, { radius: 0.3, scale: 0.55 }); m.deco('p_barrel', 6.5, 1.5, { radius: 0.3, scale: 0.55 });
    m.deco('p22_innsign', 9.5, 1.4, { radius: 0.2, scale: 0.7, label: TX.innSign });
    m.npc('p22_gideon', 2.6, 3.4, { facing: Math.PI / 2 });
    m.npc('p22_absalom', 11.8, 5.6, { facing: Math.PI });
    m.baseCount = m.entities.length;
    m._p22 = true;
    return m;
  }

  function hookDowns(d) {
    const [x, y] = STILE_DOWNS;
    d.set(x, y, DOOR({ tex: 't_p20_gate', portal: { map: COMBE, x: STILE[0] + 0.5, y: 1.6, dir: Math.PI / 2 }, label: TX.stileIn }));
    if (d._decalsAll) delete d._decalsAll[y * d.w + x];
  }

  // ================================================================ transient life: sheep, flowers, fires, followers
  const T = { followers: [], hum: null, lastBleat: 0, nextBleat: 6, sheep: [] };
  const sheepEnt = (sprite, x, y, opts) => Object.assign({ kind: 'deco', sprite, x, y, solid: false, radius: 0.32, scale: 0.42, transient: true, _p22: 'sheep',
    use: 'p22_sheep', label: TX.sheep.ewe, homeX: x, homeY: y, _sx: x, _sy: y, _base: sprite, _t: prand() * 6, _mv: 0, _dir: prand() * 6.28 }, opts || {});
  function clearTransient(m) { if (!m || !Array.isArray(m.entities)) return; for (let i = m.entities.length - 1; i >= 0; i--) if (m.entities[i] && m.entities[i]._p22) m.entities.splice(i, 1); }
  // the flock: in the fold, and out on the grass by day once enough are home; on the Downs once the flock is whole
  function flockSpots(id) {
    const out = [];
    if (id === COMBE) {
      // the six that came home on their own, and every stray brought back
      const n = 6 + homeCount();
      for (let i = 0; i < n; i++) {
        const day = !night() && i % 2 === 0;
        const x = day ? 29 + (i * 7 % 11) + 0.3 : FOLD.x0 + 1.4 + (i * 3 % 5) * 0.95, y = day ? 40 + (i * 5 % 8) + 0.4 : FOLD.y0 + 1.5 + ((i * 2) % 4) * 0.8;
        out.push({ sprite: i === 0 ? 'p22_tup' : i % 4 === 3 ? 'p22_lamb' : 'p22_ewe', x, y, r: day ? 2.2 : 0.7 });
      }
    } else if (id === DOWNS && flockStage() >= 2) {
      for (let i = 0; i < 8; i++) out.push({ sprite: i % 4 === 3 ? 'p22_lamb' : 'p22_ewe', x: 12 + (i * 7 % 16) + 0.4, y: 20 + (i * 5 % 9) + 0.5, r: 2.4 });
    }
    return out;
  }
  function addSheep(m) {
    if (!m) return;
    for (const s of flockSpots(m.id)) {
      const e = sheepEnt(s.sprite, s.x, s.y, { _range: s.r });
      if (s.sprite === 'p22_tup') { e.label = TX.sheep.tup; e.scale = 0.48; }
      if (s.sprite === 'p22_lamb') { e.label = TX.sheep.lamb; e.scale = 0.3; }
      if (!solidHere(e.x, e.y)) m.entities.push(e);
    }
    // strays still waiting where they were last seen (not yet found)
    if (flockStage() >= 1) STRAYS.forEach((s, i) => { if (s.map === m.id && !found(i)) m.entities.push(sheepEnt('p22_ewe', s.x, s.y, { label: TX.sheep.stray, stray: i, _range: 0.6, scale: 0.42 })); });
  }
  const solidHere = (x, y) => { try { return typeof solidAt === 'function' && solidAt(x, y); } catch (e) { return false; } };
  function addFlowers(m) {
    if (!m || m.id !== COMBE) return;
    const r = seeded(2207); let n = 0;
    for (let i = 0; i < 260 && n < 150; i++) {
      const x = 1.5 + r() * (CW - 3), y = 1.5 + r() * (CH - 3), cx = Math.floor(x), cy = Math.floor(y);
      if (m.get(cx, cy) || !m.floorCells) continue; const f = m.floorCells[cy * m.w + cx]; if (f !== 6 && f !== 0) continue;
      m.entities.push({ kind: 'deco', sprite: 'p22_flowers' + (1 + (i % 3)), x, y, solid: false, radius: 0.1, scale: 0.26 + r() * 0.1, transient: true, nopick: true, _p22: 'flower', label: TX.flowers });
      n++;
    }
    stats.flowers = n;
  }
  function addFires(m) {
    if (!m) return;
    const burning = fireStage() >= 1;
    BEACONS.forEach((b, i) => {
      if (b.map !== m.id) return;
      if (m.id === COMBE) { const e = m.entities.find((q) => q && q.beacon === i && !q._p22); if (e) { e.sprite = lit(i) ? 'p22_beacon_lit' : 'p22_beacon'; } }
      if (m.id === DOWNS) {
        const cairn = m.entities.find((q) => q && q.sprite === 'p20_cairn');
        if (cairn) { cairn.use = burning ? 'p22_beacon' : cairn.use; if (burning) cairn.beacon = 0; }
        if (lit(i)) m.entities.push({ kind: 'deco', sprite: 'p22_beacon_lit', x: b.x, y: b.y + 0.15, solid: false, radius: 0.2, scale: 1.0, transient: true, nopick: true, _p22: 'fire' });
      }
    });
    fireLight(m);
    stats.fires = litCount();
  }
  function syncDownsSign(m) {
    if (!m || m.id !== DOWNS) return;
    const s = m.entities.find((q) => q && q.sprite === 'sign' && /SHEEP-WALK/.test(q.label || ''));
    if (!s) return; if (s._p22orig === undefined) s._p22orig = s.label;
    s.label = flockStage() >= 2 ? TX.downsSign : s._p22orig;
  }
  function syncPylon(m) { if (!m || m.id !== COMBE) return; const e = m.entities.find((q) => q && q.use === 'p22_pylon'); if (e) { e.sprite = silenced() ? 'p22_pylon_cut' : 'p22_pylon'; e.label = silenced() ? TX.pylonQuiet : TX.pylonHum; } }
  function syncStakes(m) { if (!m || m.id !== COMBE) return; for (const e of m.entities) if (e && e.use === 'p22_scour') { const done = scoured(e.stake); e.sprite = done ? 'p22_stake_done' : 'p22_stake'; e.label = done ? TX.ramDone : TX.ramHint; } }
  function syncSheep() { if (hasG() && G.map && (G.mapId === COMBE || G.mapId === DOWNS || G.mapId === INN)) syncMap(G.map); }
  // after a stake, a fire or the wire: refresh only what they change, so the flock and the ewes at your heels stay put
  function syncQuest() {
    if (!hasG() || !G.map) return; const m = G.map;
    if (m.id === COMBE) { syncRam(m); syncPylon(m); syncStakes(m); }
    if (m.id === DOWNS) syncDownsSign(m);
    if (m.id === COMBE || m.id === DOWNS) { for (let i = m.entities.length - 1; i >= 0; i--) if (m.entities[i] && m.entities[i]._p22 === 'fire') m.entities.splice(i, 1); addFires(m); }
  }
  // a lit fire throws light from dusk to dawn, whenever it was lit (checked every couple of seconds, not only on load)
  const FIRE_COL = [110, 60, 16];
  function fireLight(m) {
    if (!m || (m.id !== COMBE && m.id !== DOWNS)) return;
    const dark = night() || hour() > 17.5;
    for (const e of m.entities) {
      if (!e) continue;
      if (e._p22 === 'fire' || (e.beacon != null && !e._p22 && m.id === COMBE)) e.lightCol = dark && (e._p22 === 'fire' || lit(e.beacon)) ? FIRE_COL : undefined;
    }
  }
  function syncMap(m) {
    if (!m || (m.id !== COMBE && m.id !== DOWNS && m.id !== INN)) return;
    clearTransient(m);
    if (m.id === COMBE) { syncRam(m); syncPylon(m); syncStakes(m); addFlowers(m); addLush(m, combeZone, 1900, 2209); }
    if (m.id === DOWNS) syncDownsSign(m);
    if (m.id !== INN) { addSheep(m); addFires(m); }
    addFollowers(m);
    stats.sheep = m.entities.filter((e) => e && e._p22 === 'sheep').length;
  }
  // followers: every found-and-not-home ewe walks behind you on the open maps, and waits outside the inn
  function addFollowers(m) {
    T.followers = [];
    let n = 0; for (let i = 0; i < EWES; i++) if (following(i)) n++;
    if (!n) return;
    if (!m.outdoor) { msg(TX.sheep.waits, '', 3000); return; }
    let k = 0;
    for (let i = 0; i < EWES; i++) {
      if (!following(i)) continue;
      const p = behind(1.2 + k * 0.7, (k % 2 ? 0.5 : -0.5));
      const e = sheepEnt('p22_ewe', p.x, p.y, { label: TX.sheep.stray, follow: i, _range: 0 });
      if (solidHere(e.x, e.y)) { e.x = Engine.cam.x; e.y = Engine.cam.y; }
      m.entities.push(e); T.followers.push(e); k++;
    }
    stats.followers = T.followers.length;
  }
  function behind(dist, side) {
    const c = Engine.cam, cs = Math.cos(c.dir), sn = Math.sin(c.dir);
    return { x: c.x - cs * dist - sn * side, y: c.y - sn * dist + cs * side };
  }

  // per-frame: sheep amble and graze; followers keep up and are counted home at the fold; the pylon hums
  function tick(dt) {
    if (!hasG() || G.state !== 'play' || !G.map || !G.ents) { humStop(); return; }
    const id = G.mapId;
    if (id !== COMBE && id !== DOWNS) { humStop(); return; }
    stats.ticks++;
    T.lightT = (T.lightT || 0) - dt; if (T.lightT <= 0) { T.lightT = 2; fireLight(G.map); }
    const c = Engine.cam, rx = -Math.sin(c.dir), ry = Math.cos(c.dir);
    for (const e of G.ents) {
      if (!e || e._p22 !== 'sheep' || e.hidden) continue;
      e._t -= dt;
      if (e.follow != null) {
        // keep a pace or two behind; near the fold they see it and go in on their own, through the gate
        const slot = T.followers.indexOf(e), atFold = id === COMBE && Math.hypot(c.x - FOLD.cx, c.y - FOLD.cy) < 6;
        const inGate = e.y > FOLD.y0 - 0.2, tgt = atFold ? (inGate ? { x: FOLD.cx + (slot % 3 - 1) * 0.8, y: FOLD.cy + 0.4 } : { x: FOLD.cx, y: FOLD.y0 + 0.5 }) : behind(1.3 + slot * 0.75, slot % 2 ? 0.45 : -0.45);
        const dx = tgt.x - e.x, dy = tgt.y - e.y, d = Math.hypot(dx, dy), dp = Math.hypot(c.x - e.x, c.y - e.y);
        if (dp > 10 && !atFold) { const s = [tgt, behind(1.4, 0)].find((p) => !solidHere(p.x, p.y)); if (s) { e.x = s.x; e.y = s.y; } }
        else if (d > 0.5) { const sp = Math.min(5.5, 1.4 + (d - 0.5) * 1.6), step = Math.min(sp * dt, d); if (typeof moveWithSlide === 'function') moveWithSlide(e, dx / d * step, dy / d * step, e); e._mv = 0.3; e._dir = Math.atan2(dy, dx); }
        if (id === COMBE && Math.hypot(e.x - FOLD.cx, e.y - FOLD.cy) < FOLD.r + 0.6) bringHome(e);
      } else if (e._range > 0) {
        if (e._t <= 0) { e._t = 2 + prand() * 5; const go = prand() < 0.45; e._mv = go ? 0.8 + prand() * 1.6 : 0; e._dir = prand() * 6.28; if (Math.hypot(e.x - e._sx, e.y - e._sy) > e._range) e._dir = Math.atan2(e._sy - e.y, e._sx - e.x); }
        if (e._mv > 0) {
          e._mv -= dt; const sp = 0.32 * dt, nx = e.x + Math.cos(e._dir) * sp, ny = e.y + Math.sin(e._dir) * sp;
          if (!solidHere(nx, ny) && !waterAt(nx, ny)) { e.x = nx; e.y = ny; } else { e._dir += 2; e._mv = 0; }
        }
      }
      // the picture: walking frames while moving, grazing most of the rest of the time; turned to the way it walks
      const moving = e._mv > 0, base = e._base || 'p22_ewe', graze = !moving && Math.sin(e._t * 1.3 + e.homeX) > -0.2;
      e.animSprite = moving ? (Math.floor(G.time * 6 + e.homeY) % 2 ? base + '_w' : base) : graze ? base + '_g' : base;
      e.animFlip = (Math.cos(e._dir) * rx + Math.sin(e._dir) * ry) > 0;
      e.facing = e._dir;
    }
    // now and then one of them bleats, from where it stands
    T.nextBleat -= dt;
    if (T.nextBleat <= 0) {
      T.nextBleat = 5 + prand() * 12;
      const near = G.ents.filter((e) => e && e._p22 === 'sheep' && Math.hypot(e.x - c.x, e.y - c.y) < 14);
      if (near.length) bleat(near[(prand() * near.length) | 0], 0.6);
    }
    // a bell-ash nearby rings, very small, when the wind moves it
    T.nextChime = (T.nextChime == null ? 4 : T.nextChime) - dt;
    if (T.nextChime <= 0) {
      T.nextChime = 3 + prand() * 6;
      const ash = G.ents.find((e) => e && e.sprite === 'p22_bellash' && Math.hypot(e.x - c.x, e.y - c.y) < 7);
      if (ash) chime(ash);
    }
    if (id === COMBE) humTick(); else humStop();
  }
  function chime(e) {
    stats.chimes = (stats.chimes || 0) + 1;
    if (!audioOk()) return;
    try {
      const ctx = Audio_.ctx, t = ctx.currentTime, c = Engine.cam, d = Math.hypot(e.x - c.x, e.y - c.y), g0 = 0.035 * Math.max(0.1, 1 - d / 8);
      const notes = [1318.5, 1567.98, 1760, 2093], n = 2 + ((prand() * 3) | 0);
      for (let i = 0; i < n; i++) {
        const o = ctx.createOscillator(), g = ctx.createGain(), at = t + i * (0.09 + prand() * 0.12);
        o.type = 'sine'; o.frequency.value = notes[(prand() * notes.length) | 0];
        g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(g0, at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.9);
        o.connect(g); g.connect(Audio_.sfxBus); o.start(at); o.stop(at + 0.95);
      }
    } catch (x) { warnOnce('chime', x); }
  }
  const waterAt = (x, y) => { try { const m = G.map; return !!(m.floorCells && m.floorCells[Math.floor(y) * m.w + Math.floor(x)] === 2); } catch (e) { return false; } };
  function bringHome(e) {
    const i = e.follow; if (i == null || home(i)) return;
    setFlag('h' + i, 1); e.follow = null; e._range = 0.7; e._sx = FOLD.cx; e._sy = FOLD.cy;
    const k = T.followers.indexOf(e); if (k >= 0) T.followers.splice(k, 1);
    bleat(e, 1); msg(TX.sheep.home, 'good', 4000);
    try { G.player.gold += 5; } catch (x) { /* none */ }
    if (homeCount() >= EWES) msg(TX.tamar.thanks, 'good', 4000);
  }

  // ---------------------------------------------------------------- sound: a bleat (two formants and a wobble) and the pylon's hum
  const audioOk = () => { try { return typeof Audio_ !== 'undefined' && Audio_.ctx && Audio_.sfxBus && !Audio_.muted && Audio_.ctx.state !== 'closed'; } catch (e) { return false; } };
  function bleat(e, vol) {
    stats.bleats++;
    if (!audioOk() || !e) return;
    try {
      const ctx = Audio_.ctx, t = ctx.currentTime, c = Engine.cam, d = Math.hypot(e.x - c.x, e.y - c.y), g0 = vol * Math.max(0.05, 1 - d / 15) * 0.22;
      const o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(), g = ctx.createGain();
      const base = (e._base === 'p22_lamb' ? 520 : e._base === 'p22_tup' ? 210 : 330) * (0.94 + prand() * 0.12);
      o.type = 'sawtooth'; o.frequency.setValueAtTime(base, t); o.frequency.linearRampToValueAtTime(base * 0.92, t + 0.55);
      lfo.frequency.value = 7 + prand() * 3; lg.gain.value = base * 0.04; lfo.connect(lg); lg.connect(o.frequency);
      f1.type = 'bandpass'; f1.frequency.value = 820; f1.Q.value = 3; f2.type = 'lowpass'; f2.frequency.value = 2400;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(g0, t + 0.06); g.gain.setValueAtTime(g0, t + 0.38); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      let out = g;
      if (ctx.createStereoPanner) { const pn = ctx.createStereoPanner(), rel = Math.atan2(e.y - c.y, e.x - c.x) - c.dir; pn.pan.value = Math.max(-0.9, Math.min(0.9, Math.sin(rel))); g.connect(pn); out = pn; }
      o.connect(f1); f1.connect(f2); f2.connect(g); out.connect(Audio_.sfxBus);
      o.start(t); lfo.start(t); o.stop(t + 0.75); lfo.stop(t + 0.75);
    } catch (x) { warnOnce('bleat', x); }
  }
  function humTick() {
    if (silenced() || !audioOk()) { humStop(); return; }
    const c = Engine.cam, d = Math.hypot(PYLON[0] - c.x, PYLON[1] - c.y), want = d < 18 ? 0.05 * (1 - d / 18) : 0;
    if (!want) { humStop(); return; }
    try {
      if (!T.hum) {
        const ctx = Audio_.ctx, o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
        o1.type = 'sine'; o1.frequency.value = 58.27; o2.type = 'triangle'; o2.frequency.value = 116.8; g.gain.value = 0;
        o1.connect(g); o2.connect(g); g.connect(Audio_.sfxBus); o1.start(); o2.start(); T.hum = { o1, o2, g };
      }
      T.hum.g.gain.setTargetAtTime(want, Audio_.ctx.currentTime, 0.3);
    } catch (e) { warnOnce('hum', e); humStop(); }
  }
  function humStop() { if (!T.hum) return; try { T.hum.o1.stop(); T.hum.o2.stop(); T.hum.g.disconnect(); } catch (e) { /* already gone */ } T.hum = null; }

  // ================================================================ using things
  function use(e) {
    switch (e.use) {
      case 'p22_sheep': return useSheep(e);
      case 'p22_tree': return pickApple(e);
      case 'p22_furze': return takeFurze();
      case 'p22_beacon': return lightBeacon(e);
      case 'p22_scour': return scour(e);
      case 'p22_pylon': return usePylon(e);
      default: return false;
    }
  }
  function useSheep(e) {
    if (e.stray != null && flockStage() >= 1 && !found(e.stray)) {
      setFlag('f' + e.stray, 1); const i = e.stray;
      e.stray = null; e.follow = i; e._range = 0; T.followers.push(e);
      bleat(e, 1); msg(TX.sheep.follow, 'good', 3500);
      return true;
    }
    bleat(e, 0.9);
    msg(e.follow != null ? TX.sheep.follow : TX.sheep.stroke[(prand() * TX.sheep.stroke.length) | 0], '', 3000);
    return true;
  }
  function pickApple(e) {
    const d = today() + 1, i = num(e.tree, 0, 15, 0);
    if (flag('aday', 100000) !== d) { setFlag('aday', d, 100000); setFlag('apick', 0, 65535); }
    const mask = flag('apick', 65535);
    if (mask & (1 << i)) { msg(TX.treePicked, '', 3000); return true; }
    setFlag('apick', mask | (1 << i), 65535); G.give('p22_apple'); msg(TX.treePick, 'good', 3000);
    try { Audio_.sfx.pickup(); } catch (x) { /* silent */ }
    return true;
  }
  function takeFurze() {
    const have = (G.player.inv.find((s) => s && s.id === 'p22_furze') || { n: 0 }).n;
    if (have >= FIRES - litCount()) { msg(TX.fire.furzeFull, '', 3000); return true; }
    G.give('p22_furze'); msg(TX.fire.furze, 'good', 3000);
    try { Audio_.sfx.pickup(); } catch (x) { /* silent */ }
    return true;
  }
  function lightBeacon(e) {
    const i = num(e.beacon, 0, FIRES - 1, 0);
    if (lit(i)) { msg(night() ? TX.fire.already : TX.fire.day, '', 3500); return true; }
    if (!G.has('p22_furze')) { msg(TX.fire.none, 'warn', 4000); return true; }
    if (!G.has('p22_tinder')) { msg(TX.fire.noTinder, 'warn', 4500); return true; }
    G.take('p22_furze'); setFlag('b' + i, 1);
    msg(TX.fire.lit, 'good', 5000);
    try { Audio_.sfx.door(); } catch (x) { /* silent */ }
    syncQuest();
    return true;
  }
  function scour(e) {
    const i = num(e.stake, 0, STAKES - 1, 0);
    if (scoured(i)) { msg(TX.ramDone, '', 3500); return true; }
    showEvent(TX.scour.event, TX.scour.body, [
      { t: TX.scour.go, f: () => {
        try { passHours(1); } catch (x) { /* time stands */ }
        setFlag('s' + i, 1); if (ramStage() === 0) setFlag('ram', 1, 2);
        syncQuest();
        msg(scourCount() >= STAKES ? TX.scour.all : TX.scour.did, 'good', 6000);
      } },
      { t: TX.scour.leave },
    ]);
    return true;
  }
  function usePylon(e) {
    if (silenced()) { msg(TX.pylonQuiet, '', 3500); return true; }
    const alive = G.ents.some((q) => q && q.kind === 'enemy' && !q.dead && Math.hypot(q.x - PYLON[0], q.y - PYLON[1]) < 12);
    if (alive) { msg(TX.pylon.hounds, 'warn', 4500); return true; }
    showEvent(TX.pylon.event, TX.pylon.body, [
      { t: TX.pylon.cut, f: () => {
        setFlag('hum', 1); humStop();
        try { if (!G.has('p22_tally')) G.give('p22_tally'); G.give('shard'); G.player.gold += 20; } catch (x) { /* none */ }
        msg(TX.pylon.done, 'good', 6000); journal('side', TX.journal.pylon); syncQuest();
      } },
      { t: TX.pylon.leave },
    ]);
    return true;
  }

  // ================================================================ wiring
  function wire() {
    installArt(); installItems(); installPeople(); installMenus();
    try { installPixelIcons(); } catch (e) { warnOnce('pixel icons', e); }
    try {
      if (typeof LANDMARKS !== 'undefined') {
        // the Grey Teeth to the north, the chalk rolling away west and south (bearings in Wethercombe's own frame)
        if (!LANDMARKS[COMBE]) LANDMARKS[COMBE] = [
          { a: -1.5, aw: 1.2, h: 0.26, p: 1.4, ridge: 0.5, seed: 2.2, far: 0.85, cap: [160, 166, 184], capH: 0.28, c: [42, 46, 62] },
          { a: 2.9, aw: 1.4, h: 0.12, p: 1.0, ridge: 0.4, seed: 5.1, far: 0.55, c: [52, 60, 56] },
          { a: 1.4, aw: 0.9, h: 0.09, p: 1.2, far: 0.6, c: [48, 56, 52] },
        ];
      }
    } catch (e) { warnOnce('landmarks', e); }
    try { if (typeof SCREENS !== 'undefined' && SCREENS.FAMILY) { SCREENS.FAMILY[COMBE] = 'hedge'; SCREENS.FAMILY[INN] = 'hearth'; } } catch (e) { /* no arrival cards */ }
    try { if (typeof FLORA !== 'undefined' && FLORA.PLANS && !FLORA.PLANS[COMBE]) FLORA.PLANS[COMBE] = { grass: 260, reed: 30 }; } catch (e) { /* no grass */ }
    if (typeof buildAllMaps === 'function') {
      const _b = buildAllMaps;
      buildAllMaps = function () {
        const maps = _b.apply(this, arguments);
        try {
          if (maps[DOWNS] && !maps[COMBE]) {
            hookDowns(maps[DOWNS]); paintPeople(); maps[COMBE] = buildCombe(); maps[INN] = buildInn();
            if (typeof FLORA !== 'undefined' && FLORA.place) FLORA.place({ [COMBE]: maps[COMBE] });
          }
        } catch (e) { warnOnce('maps', e); }
        return maps;
      };
    }
    if (typeof loadMap === 'function') {
      const _l = loadMap;
      loadMap = function (id) {
        const r = _l.apply(this, arguments);
        try { closeAtLeaving(); } catch (e) { warnOnce('close', e); }
        try { humStop(); if (id === COMBE || id === DOWNS || id === INN) { paintPeople(); syncMap(G.maps[id]); } } catch (e) { warnOnce('load', e); }
        return r;
      };
    }
    if (typeof update === 'function') {
      const _u = update;
      update = function (dt) { const r = _u.apply(this, arguments); try { tick(Math.min(0.1, Number(dt) || 0)); } catch (e) { warnOnce('tick', e); } return r; };
    }
    if (typeof useDeco === 'function') {
      const _d = useDeco;
      useDeco = function (e) { try { if (e && typeof e.use === 'string' && e.use.startsWith('p22_') && use(e)) return; } catch (x) { warnOnce('use', x); } return _d.apply(this, arguments); };
    }
    if (typeof useItem === 'function') {
      const _i = useItem;
      useItem = function (slot) { try { const it = slot && ITEMS[slot.id]; if (it && it.use === 'p22_food') { eat(slot); return; } } catch (x) { warnOnce('eat', x); } return _i.apply(this, arguments); };
    }
  }
  wire();

  return {
    DOWNS, COMBE, INN, OFF, STILE, STILE_DOWNS, PYLON, FOLD, BEACONS, STRAYS, TREES, RAM, STAKE_AT, MENUS, DISH, MUTTON, TX, TEXTS: LIST, stats,
    ITEM_DEFS, NPC_DEFS, buildCombe, buildInn, syncMap, ramCells, homeCount, scourCount, litCount, flockStage, ramStage, fireStage, silenced,
    bleat, T, addLush, LUSH, closeAtLeaving,
  };
})();
if (typeof window !== 'undefined') window.SHEEPWALK22 = SHEEPWALK22;
